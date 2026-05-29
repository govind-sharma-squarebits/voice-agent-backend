import { LeadStep } from '../types/index.js';
import { leadStepSchemas } from '../validators/lead.validator.js';
const STEP_CONFIG = {
    [LeadStep.NAME]: {
        question: "Great! To get started, could I get your full name please?",
        next: LeadStep.EMAIL,
    },
    [LeadStep.EMAIL]: {
        question: "Thanks! And what's the best email address to reach you at?",
        next: LeadStep.PHONE,
    },
    [LeadStep.PHONE]: {
        question: "Perfect. What's your phone number?",
        next: LeadStep.COMPANY,
    },
    [LeadStep.COMPANY]: {
        question: "What company are you with? Feel free to skip this if you prefer.",
        next: LeadStep.SERVICE,
    },
    [LeadStep.SERVICE]: {
        question: "Which of our services are you most interested in? We offer Website Development, Mobile Apps, SaaS, AI, Voice Agents, Dashboards, Automation, UI/UX Design, or Custom Software.",
        next: LeadStep.REQUIREMENTS,
    },
    [LeadStep.REQUIREMENTS]: {
        question: "Could you briefly describe what you're looking to build or what problem you're trying to solve?",
        next: LeadStep.COMPLETE,
    },
};
export class LeadCollector {
    /**
     * Returns the question to ask for a given step.
     */
    getQuestion(step) {
        if (step === LeadStep.COMPLETE)
            return '';
        return STEP_CONFIG[step].question;
    }
    /**
     * Returns the next step after the given one.
     */
    getNextStep(step) {
        if (step === LeadStep.COMPLETE)
            return LeadStep.COMPLETE;
        return STEP_CONFIG[step].next;
    }
    /**
     * Checks if the step is the terminal state.
     */
    isComplete(step) {
        return step === LeadStep.COMPLETE;
    }
    /**
     * Validates a value for the given step.
     * Returns { valid: true } or { valid: false, error: string }
     */
    validate(step, value) {
        if (step === LeadStep.COMPLETE)
            return { valid: true };
        // Company field is optional — skip empty values
        if (step === LeadStep.COMPANY && (!value || value.toLowerCase().trim() === 'skip')) {
            return { valid: true };
        }
        const schema = leadStepSchemas[step];
        const result = schema.safeParse(value.trim());
        if (!result.success) {
            const errorMessage = result.error.issues[0]?.message ?? 'Invalid input';
            return { valid: false, error: errorMessage };
        }
        return { valid: true };
    }
    /**
     * Returns a user-friendly retry message when validation fails.
     */
    getRetryMessage(step, error) {
        const retries = {
            [LeadStep.EMAIL]: `That doesn't look like a valid email address. Could you double-check it for me? ${error}`,
            [LeadStep.PHONE]: `I need a valid phone number to have our team reach you. Could you provide it again? ${error}`,
            [LeadStep.NAME]: `I need at least your first and last name. Could you share your full name?`,
        };
        return retries[step] ?? `Could you try that again? ${error}`;
    }
}
