// ============================================================
// Teqvira AI Voice Agent — Shared Types & Enums
// ============================================================
export var AgentMode;
(function (AgentMode) {
    AgentMode["IDLE"] = "idle";
    AgentMode["ACTIVE"] = "active";
    AgentMode["VISITOR"] = "visitor";
    AgentMode["SERVICE"] = "service";
    AgentMode["STANDBY"] = "standby";
})(AgentMode || (AgentMode = {}));
export var LeadStep;
(function (LeadStep) {
    LeadStep["NAME"] = "name";
    LeadStep["EMAIL"] = "email";
    LeadStep["PHONE"] = "phone";
    LeadStep["COMPANY"] = "company";
    LeadStep["SERVICE"] = "service";
    LeadStep["REQUIREMENTS"] = "requirements";
    LeadStep["COMPLETE"] = "complete";
})(LeadStep || (LeadStep = {}));
export var LeadStatus;
(function (LeadStatus) {
    LeadStatus["NEW"] = "new";
    LeadStatus["IN_PROGRESS"] = "in_progress";
    LeadStatus["CONVERTED"] = "converted";
})(LeadStatus || (LeadStatus = {}));
export var MessageRole;
(function (MessageRole) {
    MessageRole["USER"] = "user";
    MessageRole["ASSISTANT"] = "assistant";
})(MessageRole || (MessageRole = {}));
export var TeqviraService;
(function (TeqviraService) {
    TeqviraService["WEBSITE_DEV"] = "Website Development";
    TeqviraService["MOBILE_APP_DEV"] = "Mobile App Development";
    TeqviraService["SAAS_DEV"] = "SaaS Development";
    TeqviraService["AI_DEV"] = "AI Development";
    TeqviraService["AI_VOICE_AGENTS"] = "AI Voice Agents";
    TeqviraService["DASHBOARD_DEV"] = "Dashboard Development";
    TeqviraService["AUTOMATION"] = "Automation Systems";
    TeqviraService["UI_UX_DESIGN"] = "UI/UX Design";
    TeqviraService["CUSTOM_SOFTWARE"] = "Custom Software Development";
})(TeqviraService || (TeqviraService = {}));
// ---- Typed Error ------------------------------------------------
export class AppError extends Error {
    code;
    statusCode;
    constructor(code, message, statusCode = 500) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.name = 'AppError';
    }
}
