import { AgentMode } from '../types/index.js';
const VISITOR_KEYWORDS = [
    'just visiting', 'just browsing', 'just looking', 'exploring', 'looking around',
    'checking out', 'checking the site', 'just came', 'just checking', 'only visiting',
    'no service', 'nothing right now', 'not now', 'not yet', 'maybe later', 'just curious',
    'just want to see', 'just see what', 'browse', 'visit',
];
const SERVICE_KEYWORDS = [
    // Direct build/development intents
    'need a website', 'need an app', 'need a mobile', 'need saas', 'need ai',
    'need automation', 'need dashboard', 'need design', 'need software',
    'build a', 'develop a', 'create a', 'want to build', 'want to develop',
    'looking for a developer', 'looking for development', 'looking for design',
    // Specific project and service intents
    'discuss a project', 'start a project', 'new project', 'my project', 'our project',
    'hire your team', 'hire developer', 'hire you for',
    'discuss a service', 'interested in a service', 'need a service',
    // Commercial intent
    'quote', 'cost to build', 'how much to build',
    'pricing', 'cost', 'how much', 'budget', 'proposal',
    // Affirmative service intake answers
    'yes', 'sure', 'absolutely', 'definitely', "i'd like", 'i would like',
    'please', 'help me build', 'help me develop', 'help me create'
];
/**
 * Detects user intent from message text.
 * Returns VISITOR if user is browsing only,
 * SERVICE if user wants to discuss work,
 * ACTIVE as default (continue conversation).
 */
export function detectIntent(text) {
    const lower = text.toLowerCase().trim();
    const isVisitor = VISITOR_KEYWORDS.some(kw => lower.includes(kw));
    const isService = SERVICE_KEYWORDS.some(kw => lower.includes(kw));
    // Service intent takes priority over visitor if both detected
    if (isService && !isVisitor)
        return AgentMode.SERVICE;
    if (isVisitor && !isService)
        return AgentMode.VISITOR;
    return AgentMode.ACTIVE;
}
