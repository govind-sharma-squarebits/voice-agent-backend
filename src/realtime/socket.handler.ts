import { Server, Socket } from 'socket.io';
import { AIService } from '../services/ai.service.js';
import { VoiceService } from '../services/voice.service.js';

/**
 * Production-Grade Socket Handler.
 * Manages per-connection AI and Voice state with stream protection.
 */
export const setupSocketHandlers = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    console.log(`📡 [PROD] Client connected: ${socket.id}`);
    
    // Services localized to this session
    const voiceService = new VoiceService(socket);
    const aiService = new AIService();

    socket.on('chat-message', async (text: string) => {
      if (!text?.trim()) return;

      const lowerText = text.toLowerCase().trim();
      
      // Keywords that indicate "just visiting" intent
      const visitingKeywords = [
        'visit', 'exploring', 'looking around', 'just looking', 
        'browsing', 'checking out', 'just come', 'viewing'
      ];

      const isVisitingIntent = visitingKeywords.some(keyword => lowerText.includes(keyword));

      // Custom reply for visiting intent
      if (isVisitingIntent) {
        const reply = "ok if you want to call me back just say hey govind voice agent";
        socket.emit('ai-text-partial', reply);
        await voiceService.streamTTS(reply);
        socket.emit('ai-response', reply);
        // Signal to frontend to close UI after speaking
        socket.emit('close-ui');
        return;
      }

      try {
        voiceService.resetInterrupt();
        
        const aiStream = await aiService.getStreamingResponse(text);
        let fullResponse = '';
        let sentenceBuffer = '';

        for await (const chunk of aiStream) {
          const content = chunk.text();
          if (!content) continue;

          // Stream Delta Calculation
          let delta = content;
          if (fullResponse && content.startsWith(fullResponse)) {
            delta = content.slice(fullResponse.length);
          }
          if (!delta) continue;

          fullResponse += delta;
          sentenceBuffer += delta;
          
          socket.emit('ai-text-partial', delta);

          // Sentence splitting for natural speech latency
          if (/[.!?]/.test(sentenceBuffer)) {
            const parts = sentenceBuffer.split(/([.!?])/);
            while (parts.length > 2) {
              const sentence = (parts.shift()! + parts.shift()!).trim();
              if (sentence) {
                await voiceService.streamTTS(sentence);
              }
            }
            sentenceBuffer = parts.join('');
          }
        }

        // Finalize conversation
        if (sentenceBuffer.trim()) {
          await voiceService.streamTTS(sentenceBuffer.trim());
        }

        socket.emit('ai-response', fullResponse);
        aiService.addToHistory('user', text);
        aiService.addToHistory('assistant', fullResponse);
        
        console.log(`✅ Streaming completed for session: ${socket.id}`);

      } catch (error: any) {
        console.error(`❌ [PROD] AI Stream Error [${socket.id}]:`, error.message || error);
        socket.emit('error', 'The AI is taking a moment to recover. Please try again.');
      }
    });

    socket.on('speak', async (text: string) => {
      console.log(`🗣️ [PROD] Speak requested: "${text}" from ${socket.id}`);
      try {
        socket.emit('ai-text-partial', text);
        await voiceService.streamTTS(text);
        socket.emit('ai-response', text);
      } catch (error) {
        console.error(`❌ [PROD] Speak Error [${socket.id}]:`, error);
      }
    });

    socket.on('wake-up', async () => {
      console.log(`🔔 [PROD] Wake-up received from client: ${socket.id}`);
      try {
        const greeting = "Hi did you like the website? Do you need any service or want to discuss any business idea?";
        socket.emit('ai-text-partial', greeting);
        await voiceService.streamTTS(greeting);
        socket.emit('ai-response', greeting);
      } catch (error) {
        console.error(`❌ [PROD] Wake-up Error [${socket.id}]:`, error);
      }
    });

    socket.on('disconnect', () => {
      console.log(`📡 [PROD] Client disconnected: ${socket.id}`);
    });
  });
};
