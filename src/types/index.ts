// ============================================================
// Teqvira AI Voice Agent — Shared Types & Enums
// ============================================================

export enum AgentMode {
  IDLE     = 'idle',
  ACTIVE   = 'active',
  VISITOR  = 'visitor',
  SERVICE  = 'service',
  STANDBY  = 'standby',
}

export enum LeadStep {
  NAME         = 'name',
  EMAIL        = 'email',
  PHONE        = 'phone',
  COMPANY      = 'company',
  SERVICE      = 'service',
  REQUIREMENTS = 'requirements',
  COMPLETE     = 'complete',
}

export enum LeadStatus {
  NEW         = 'new',
  IN_PROGRESS = 'in_progress',
  CONVERTED   = 'converted',
}

export enum MessageRole {
  USER      = 'user',
  ASSISTANT = 'assistant',
}

export enum TeqviraService {
  WEBSITE_DEV     = 'Website Development',
  MOBILE_APP_DEV  = 'Mobile App Development',
  SAAS_DEV        = 'SaaS Development',
  AI_DEV          = 'AI Development',
  AI_VOICE_AGENTS = 'AI Voice Agents',
  DASHBOARD_DEV   = 'Dashboard Development',
  AUTOMATION      = 'Automation Systems',
  UI_UX_DESIGN    = 'UI/UX Design',
  CUSTOM_SOFTWARE = 'Custom Software Development',
}

// ---- DTOs -------------------------------------------------------

export interface MessageDto {
  role: MessageRole;
  content: string;
  timestamp: Date;
}

export interface LeadDto {
  name: string;
  email: string;
  phone: string;
  company?: string;
  service: string;
  requirements: string;
  sessionId: string;
}

export interface SessionContext {
  sessionId: string;
  socketId: string;
  mode: AgentMode;
  leadStep: LeadStep | null;
  leadData: Partial<LeadDto>;
  conversationHistory: MessageDto[];
  lastActivityAt: Date;
}

// ---- Socket Event Payloads (Inbound) ----------------------------

export interface ChatMessagePayload {
  content: string;
}

export interface AudioChunkPayload {
  chunk: Buffer;
  sequenceId: number;
}

export interface LeadStepPayload {
  value: string;
}

// ---- Socket Event Payloads (Outbound) ---------------------------

export interface SessionModePayload {
  mode: AgentMode;
}

export interface LeadQuestionPayload {
  step: LeadStep;
  question: string;
}

export interface LeadCompletePayload {
  leadId: string;
  message: string;
}

export interface LeadErrorPayload {
  step: LeadStep;
  error: string;
}

export interface SessionReadyPayload {
  sessionId: string;
}

export interface ErrorPayload {
  code: string;
  message: string;
}

// ---- Typed Error ------------------------------------------------

export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 500,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
