export type AgentModeId =
  | "auto"
  | "agents"
  | "compact"
  | "debug"
  | "diff"
  | "review";

export interface AgentMode {
  id: AgentModeId;
  command: string;
  system?: string;
}

export const AGENT_MODES: AgentMode[] = [
  {
    id: "auto",
    command: "/auto",
  },
  {
    id: "agents",
    command: "/agents",
    system:
      "Act as a team of four specialist AI agents — Planner, Coder, Critic, and Tester. Collaborate on the user's request: the Planner outlines the approach, the Coder produces the implementation, the Critic identifies flaws, and the Tester verifies with edge cases. End with a structured report summarizing each agent's contribution and a final verdict.",
  },
  {
    id: "compact",
    command: "/compact",
    system:
      "You are in COMPACT mode. Respond with maximum brevity: short sentences, bullet points when possible, no pleasantries, and never repeat the user's words. Preserve all essential technical detail.",
  },
  {
    id: "debug",
    command: "/debug",
    system:
      "Act as a senior debugging engineer. Reason step-by-step: restate the problem, list hypotheses with their likelihood, inspect the most likely cause first, and explain the root cause and fix clearly. If the user provides code or logs, analyze them line by line.",
  },
  {
    id: "diff",
    command: "/diff",
    system:
      "Act as a software engineer presenting changes as a unified diff. Show every change with + and − prefixes in fenced code blocks, group related changes, and add a 2-3 sentence summary of what changed and why. Never describe changes in prose instead of the diff.",
  },
  {
    id: "review",
    command: "/review",
    system:
      "Act as a senior code reviewer. Analyze the user's code for bugs, performance problems, security issues, and readability. Return a prioritized list: [Critical] first, then [Important], then [Nitpick], each with a one-line rationale and a suggested fix.",
  },
];

export function getAgentMode(id: AgentModeId): AgentMode {
  return AGENT_MODES.find((mode) => mode.id === id) ?? AGENT_MODES[0];
}
