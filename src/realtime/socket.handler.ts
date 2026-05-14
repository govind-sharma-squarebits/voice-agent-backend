import { Server, Socket } from 'socket.io';
import { AIService } from '../services/ai.service.js';
import { VoiceService } from '../services/voice.service.js';

export const setupSocketHandlers = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    console.log(`👤 New client connected: ${socket.id}`);
    const voiceService = new VoiceService(socket);
    const aiService = new AIService();

    socket.on('wake-up', async () => {
      try {
        const welcomeText = "Hello there! How can I help you today?";
        console.log(`🤖 AI Wakeup: ${welcomeText}`);
        socket.emit('ai-text-partial', welcomeText);
        await voiceService.streamTTS(welcomeText);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Wakeup Error:', errorMessage);
      }
    });

    socket.on('chat-message', async (text: string) => {
      try {
        console.log(`👤 User: ${text}`);
        voiceService.resetInterrupt();
        
        const aiStream = await aiService.getStreamingResponse(text);
        let fullResponse = '';
        let sentenceBuffer = '';

        for await (const chunk of aiStream) {
          const content = chunk.text();
          if (content) {
            // Fix: Check if content is accumulated or delta
            let delta = content;
            if (fullResponse && content.startsWith(fullResponse)) {
              delta = content.slice(fullResponse.length);
            }
            
            if (!delta) continue;

            fullResponse += delta;
            sentenceBuffer += delta;
            socket.emit('ai-text-partial', delta);

            // Split by punctuation for natural speaking pauses
            if (/[.!?]/.test(sentenceBuffer)) {
              // Extract sentences
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
        }

        // Final remaining text
        if (sentenceBuffer.trim()) {
          await voiceService.streamTTS(sentenceBuffer.trim());
        }

        console.log(`🤖 AI Full: ${fullResponse}`);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Socket Error:', errorMessage);
        socket.emit('error', 'AI processing failed.');
      }
    });

    socket.on('disconnect', () => {
      console.log(`👤 Client disconnected: ${socket.id}`);
    });
  });
};
