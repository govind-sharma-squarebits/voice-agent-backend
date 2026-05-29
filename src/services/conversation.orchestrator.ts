import { Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import {
  AgentMode,
  AppError,
  LeadDto,
  LeadStep,
  MessageDto,
  MessageRole,
  SessionContext,
  TeqviraService,
} from '../types/index.js';
import { AIService } from './ai.service.js';
import { VoiceService } from './voice.service.js';
import { ConversationMemoryManager } from './conversation.memory.manager.js';
import { LeadCollector } from '../ai/lead.collector.js';
import { detectIntent } from '../ai/intent.detector.js';
import { ConversationRepository } from '../repositories/conversation.repository.js';
import { LeadRepository } from '../repositories/lead.repository.js';
import { sessionLogger } from '../utils/logger.js';
import { config } from '../config/index.js';

const GREETING = "Hi, I'm Govind, Teqvira's AI Assistant. Are you just visiting our website today, or would you like to discuss a service?";
const VISITOR_REPLY = "No problem! Whenever you need assistance, just say Hey Govind and I'll be right here to help.";

export class ConversationOrchestrator {
  private sessions: Map<string, SessionContext> = new Map();
  private evictionTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly aiService: AIService,
    private readonly voiceService: VoiceService,
    private readonly memoryManager: ConversationMemoryManager,
    private readonly leadCollector: LeadCollector,
    private readonly conversationRepo: ConversationRepository,
    private readonly leadRepo: LeadRepository,
  ) {
    this.startEvictionCycle();
  }

  // ── Session Lifecycle ──────────────────────────────────────────

  async handleSessionInit(sessionId: string, socket: Socket): Promise<void> {
    if (this.memoryManager.isAtCapacity(this.sessions)) {
      socket.emit('error', { code: 'CAPACITY', message: 'Server is at capacity. Please try again shortly.' });
      return;
    }

    const context: SessionContext = {
      sessionId,
      socketId: socket.id,
      mode: AgentMode.IDLE,
      leadStep: null,
      leadData: {},
      conversationHistory: [],
      lastActivityAt: new Date(),
    };
    this.sessions.set(sessionId, context);

    await this.conversationRepo.upsertSession(sessionId, AgentMode.IDLE);
    socket.emit('session:ready', { sessionId });
    sessionLogger.info({ sessionId }, 'Session initialized');

    await this.streamResponse(GREETING, socket, sessionId);
    this.setMode(sessionId, AgentMode.ACTIVE, socket);
  }

  async handleSessionClose(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    await this.persistPendingHistory(sessionId, session);
    this.voiceService.cleanup(sessionId);
    this.sessions.delete(sessionId);
    sessionLogger.info({ sessionId }, 'Session closed');
  }

  // ── Text Message Handling ──────────────────────────────────────

  async handleTextMessage(sessionId: string, content: string, socket: Socket): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      await this.handleSessionInit(sessionId, socket);
      return;
    }

    session.lastActivityAt = new Date();
    const userMessage: MessageDto = {
      role: MessageRole.USER,
      content,
      timestamp: new Date(),
    };
    session.conversationHistory.push(userMessage);
    await this.conversationRepo.appendMessage(sessionId, userMessage);

    sessionLogger.debug({ sessionId, mode: session.mode, contentLength: content.length }, 'Text message received');

    // Route based on current mode
    if (session.mode === AgentMode.SERVICE && session.leadStep !== null) {
      await this.handleLeadStep(sessionId, content, socket);
      return;
    }

    const intent = detectIntent(content);

    if (intent === AgentMode.VISITOR && session.mode !== AgentMode.SERVICE) {
      this.setMode(sessionId, AgentMode.VISITOR, socket);
      await this.streamResponse(VISITOR_REPLY, socket, sessionId);
      this.setMode(sessionId, AgentMode.STANDBY, socket);
      return;
    }

    if (intent === AgentMode.SERVICE || session.mode === AgentMode.SERVICE) {
      this.setMode(sessionId, AgentMode.SERVICE, socket);
      session.leadStep = LeadStep.NAME;
      const question = this.leadCollector.getQuestion(LeadStep.NAME);
      await this.streamResponse(question, socket, sessionId);
      socket.emit('lead:question', { step: LeadStep.NAME, question });
      return;
    }

    // Default: active AI conversation
    await this.streamAIResponse(content, socket, sessionId, session);
  }

  // ── Lead Collection ────────────────────────────────────────────

  async handleLeadStep(sessionId: string, value: string, socket: Socket): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session || session.leadStep === null) return;

    const currentStep = session.leadStep;
    let processedValue = value;

    if (currentStep === LeadStep.SERVICE) {
      processedValue = this.mapServiceInput(value);
    }

    const validation = this.leadCollector.validate(currentStep, processedValue);

    sessionLogger.debug({ sessionId, step: currentStep, valid: validation.valid, original: value, processed: processedValue }, 'Lead step received');

    if (!validation.valid) {
      const retryMsg = this.leadCollector.getRetryMessage(currentStep, validation.error ?? '');
      socket.emit('lead:error', { step: currentStep, error: validation.error ?? '' });
      await this.streamResponse(retryMsg, socket, sessionId);
      return;
    }

    // Store valid value (company can be skipped)
    if (currentStep !== LeadStep.COMPANY || (processedValue && processedValue.toLowerCase().trim() !== 'skip')) {
      (session.leadData as Record<string, string>)[currentStep] = processedValue.trim();
    }

    const nextStep = this.leadCollector.getNextStep(currentStep);
    session.leadStep = nextStep;

    if (this.leadCollector.isComplete(nextStep)) {
      await this.completeLead(sessionId, socket, session);
      return;
    }

    const question = this.leadCollector.getQuestion(nextStep);
    socket.emit('lead:question', { step: nextStep, question });
    await this.streamResponse(question, socket, sessionId);
  }

  private mapServiceInput(input: string): string {
    const norm = input.toLowerCase().trim();
    
    if (norm.includes('voice') || norm.includes('agent') || norm.includes('call') || norm.includes('chatbot') || norm.includes('assistant')) {
      return TeqviraService.AI_VOICE_AGENTS;
    }
    if (norm.includes('web') || norm.includes('site')) {
      return TeqviraService.WEBSITE_DEV;
    }
    if (norm.includes('mobile') || norm.includes('app') || norm.includes('ios') || norm.includes('android') || norm.includes('phone')) {
      return TeqviraService.MOBILE_APP_DEV;
    }
    if (norm.includes('saas') || norm.includes('cloud') || norm.includes('software as a service')) {
      return TeqviraService.SAAS_DEV;
    }
    if (norm.includes('ai') || norm.includes('artificial') || norm.includes('intelligence') || norm.includes('llm') || norm.includes('gpt')) {
      return TeqviraService.AI_DEV;
    }
    if (norm.includes('dashboard') || norm.includes('panel') || norm.includes('portal') || norm.includes('analytics')) {
      return TeqviraService.DASHBOARD_DEV;
    }
    if (norm.includes('automat') || norm.includes('workflow') || norm.includes('bot') || norm.includes('scrap')) {
      return TeqviraService.AUTOMATION;
    }
    if (norm.includes('ui') || norm.includes('ux') || norm.includes('design') || norm.includes('figma') || norm.includes('interface') || norm.includes('graphics')) {
      return TeqviraService.UI_UX_DESIGN;
    }
    if (norm.includes('custom') || norm.includes('software') || norm.includes('program') || norm.includes('application')) {
      return TeqviraService.CUSTOM_SOFTWARE;
    }

    // Fallback to substring matching on exact enum values
    for (const val of Object.values(TeqviraService)) {
      if (norm.includes(val.toLowerCase()) || val.toLowerCase().includes(norm)) {
        return val;
      }
    }

    return input;
  }

  private async completeLead(sessionId: string, socket: Socket, session: SessionContext): Promise<void> {
    try {
      const dto: LeadDto = {
        ...(session.leadData as Omit<LeadDto, 'sessionId'>),
        sessionId,
      };
      const lead = await this.leadRepo.create(dto);
      session.leadStep = LeadStep.COMPLETE;

      const completion = `Excellent! I've got all the details. Our team will reach out to you at ${dto.email} shortly to schedule a discovery call. Is there anything else you'd like to know about Teqvira?`;
      socket.emit('lead:complete', { leadId: lead._id?.toString() as string, message: completion });
      await this.streamResponse(completion, socket, sessionId);
      this.setMode(sessionId, AgentMode.ACTIVE, socket);

      sessionLogger.info({ sessionId, leadId: lead._id?.toString(), service: dto.service }, 'Lead collected successfully');
    } catch (error) {
      sessionLogger.error({ sessionId, error: String(error) }, 'Failed to save lead');
      socket.emit('error', { code: 'LEAD_SAVE_FAILED', message: 'There was an issue saving your details. Please try again.' });
    }
  }

  // ── Audio Handling ─────────────────────────────────────────────

  async handleAudioChunk(sessionId: string, chunk: Buffer, socket: Socket): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.lastActivityAt = new Date();
    // Gemini Live integration point — chunks buffered per session
    // (GeminiLiveService will be wired here in future phase)
    sessionLogger.debug({ sessionId, bytes: chunk.length }, 'Audio chunk received');
  }

  async handleAudioTurnEnd(sessionId: string, socket: Socket): Promise<void> {
    sessionLogger.debug({ sessionId }, 'Audio turn ended — transcript would be routed here');
    // When GeminiLiveService is ready: get transcript, call handleTextMessage
  }

  cancelActiveTTS(sessionId: string): void {
    this.voiceService.cancelTTS(sessionId);
    sessionLogger.debug({ sessionId }, 'Active TTS cancelled');
  }

  // ── Streaming Response (TTS Buffering Rule Enforced) ───────────

  private async streamResponse(text: string, socket: Socket, sessionId: string): Promise<void> {
    socket.emit('ai:text:delta', text);
    socket.emit('ai:text:done', text);

    this.voiceService.registerAbortController(sessionId);
    await this.voiceService.streamTTSWithRetry(text, socket, sessionId);

    const assistantMsg: MessageDto = {
      role: MessageRole.ASSISTANT,
      content: text,
      timestamp: new Date(),
    };
    const session = this.sessions.get(sessionId);
    if (session) {
      session.conversationHistory.push(assistantMsg);
    }
    await this.conversationRepo.appendMessage(sessionId, assistantMsg);
  }

  private async streamAIResponse(
    userText: string,
    socket: Socket,
    sessionId: string,
    session: SessionContext,
  ): Promise<void> {
    // Trim history before AI call
    session.conversationHistory = this.memoryManager.trimHistory(session.conversationHistory);
    this.aiService.syncHistory(session.conversationHistory);

    const abortController = this.voiceService.registerAbortController(sessionId);

    let fullText = '';
    let sentenceBuffer = '';
    const BOUNDARY = /(?<=[.!?])\s+|(?<=\n\n)/;

    try {
      const stream = await this.aiService.getStreamingResponse(userText);

      for await (const delta of stream) {
        if (abortController.signal.aborted) break;

        fullText += delta;
        sentenceBuffer += delta;
        socket.emit('ai:text:delta', delta); // Stream to UI immediately

        // Flush to TTS only at sentence boundaries
        if (BOUNDARY.test(sentenceBuffer)) {
          const parts = sentenceBuffer.split(BOUNDARY);
          sentenceBuffer = parts.pop() ?? '';

          for (const sentence of parts) {
            const clean = sentence.trim();
            if (clean.length >= 3 && !abortController.signal.aborted) {
              await this.voiceService.streamTTSWithRetry(clean, socket, sessionId);
            }
          }
        }
      }

      // Flush remaining buffer
      if (sentenceBuffer.trim() && !abortController.signal.aborted) {
        await this.voiceService.streamTTSWithRetry(sentenceBuffer.trim(), socket, sessionId);
      }

      if (fullText) {
        socket.emit('ai:text:done', fullText);

        const assistantMsg: MessageDto = {
          role: MessageRole.ASSISTANT,
          content: fullText,
          timestamp: new Date(),
        };
        session.conversationHistory.push(assistantMsg);
        await this.conversationRepo.appendMessage(sessionId, assistantMsg);
      }
    } catch (error) {
      const err = error instanceof AppError ? error : new AppError('AI_ERROR', String(error));
      sessionLogger.error({ sessionId, code: err.code, error: err.message }, 'AI stream error');
      socket.emit('error', { code: err.code, message: 'I had trouble processing that. Could you try again?' });
    }
  }

  // ── Utilities ──────────────────────────────────────────────────

  private setMode(sessionId: string, mode: AgentMode, socket: Socket): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    const previous = session.mode;
    session.mode = mode;
    socket.emit('session:mode', { mode });
    sessionLogger.info({ sessionId, from: previous, to: mode }, 'Session mode changed');
    this.conversationRepo.updateMode(sessionId, mode).catch(() => {});
  }

  private async persistPendingHistory(sessionId: string, session: SessionContext): Promise<void> {
    if (session.conversationHistory.length === 0) return;
    try {
      await this.conversationRepo.appendMessages(sessionId, session.conversationHistory);
    } catch (error) {
      sessionLogger.error({ sessionId, error: String(error) }, 'Failed to persist session history');
    }
  }

  getSession(sessionId: string): SessionContext | undefined {
    return this.sessions.get(sessionId);
  }

  getSessionCount(): number {
    return this.sessions.size;
  }

  private startEvictionCycle(): void {
    this.evictionTimer = setInterval(() => {
      this.memoryManager.evictStaleSessions(
        this.sessions,
        config.SESSION_EVICTION_MS,
        async (sessionId, session) => {
          await this.persistPendingHistory(sessionId, session);
          this.voiceService.cleanup(sessionId);
        },
      );
    }, 5 * 60 * 1000); // every 5 minutes
  }

  shutdown(): void {
    if (this.evictionTimer) {
      clearInterval(this.evictionTimer);
    }
  }
}
