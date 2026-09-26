import React, { useState } from "react";
import { CaretDown, Check, X, Hammer } from "@phosphor-icons/react";
import AgentSkillWhitelist from "@/models/agentSkillWhitelist";
import { useTranslation } from "react-i18next";
import useTimeoutProgress from "@/hooks/useTimeoutProgress";

export default function ToolApprovalRequest({
  requestId,
  skillName,
  payload = {},
  description = null,
  timeoutMs = null,
  websocket,
  onResponse,
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [responded, setResponded] = useState(false);
  const [approved, setApproved] = useState(null);
  const [alwaysAllow, setAlwaysAllow] = useState(false);
  const hasPayload = payload && Object.keys(payload).length > 0;

  const progressPercent = useTimeoutProgress(timeoutMs, {
    active: !responded,
    intervalMs: 50,
    onTimeout: handleTimeout,
  });

  function handleTimeout() {
    if (responded) return;
    setResponded(true);
    setApproved(false);
    onResponse?.(false);
  }

  async function handleResponse(isApproved) {
    if (responded) return;

    setResponded(true);
    setApproved(isApproved);

    // If user approved and checked "Always allow", add to whitelist
    if (isApproved && alwaysAllow) {
      await AgentSkillWhitelist.addToWhitelist(skillName);
    }

    if (websocket && websocket.readyState === WebSocket.OPEN) {
      websocket.send(
        JSON.stringify({
          type: "toolApprovalResponse",
          requestId,
          approved: isApproved,
        })
      );
    }

    onResponse?.(isApproved);
  }

  return (
    <div className="flex justify-center w-full">
      <div className="w-full flex flex-col">
        <div className="w-full">
          <div
            style={{ transition: "all 0.1s ease-in-out" }}
            className="relative rounded-[14px] border border-ml-line-2 bg-ml-panel shadow-ml p-4 pb-3 flex flex-col gap-y-2 overflow-hidden"
          >
            <ToolApprovalHeader
              skillName={skillName}
              hasPayload={hasPayload}
              isExpanded={isExpanded}
              setIsExpanded={setIsExpanded}
            />
            <div className="flex flex-col gap-y-1">
              {description && (
                <span className="text-ml-text-2 font-medium font-mono text-[13.5px]">
                  {description}
                </span>
              )}
              <ToolApprovalPayload payload={payload} isExpanded={isExpanded} />
              <ToolApprovalResponseOption
                approved={approved}
                skillName={skillName}
                alwaysAllow={alwaysAllow}
                setAlwaysAllow={setAlwaysAllow}
                onApprove={() => handleResponse(true)}
                onReject={() => handleResponse(false)}
              />
              <ToolApprovalResponseMessage approved={approved} />
            </div>
            {timeoutMs && !responded && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-ml-raised-2">
                <div
                  className="h-full bg-ml-accent transition-none"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ToolApprovalHeader({
  skillName,
  hasPayload,
  isExpanded,
  setIsExpanded,
}) {
  const { t } = useTranslation();
  return (
    <div className="flex w-full items-center justify-between">
      <div className="flex items-center gap-2">
        <Hammer size={16} />
        <div className="text-ml-text font-medium text-[15px] flex gap-x-1.5">
          {t("chat_window.agent_invocation.model_wants_to_call")}
          <span className="font-mono font-semibold text-ml-accent-text">
            {skillName}
          </span>
        </div>
      </div>
      {hasPayload && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          type="button"
          className="absolute top-3 right-3 w-9 h-9 grid place-items-center rounded-[10px] text-ml-text-2 hover:bg-ml-raised hover:text-ml-text border-none"
          aria-label={isExpanded ? "Hide details" : "Show details"}
        >
          <CaretDown
            className={`w-4 h-4 transform transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
          />
        </button>
      )}
    </div>
  );
}

function ToolApprovalPayload({ payload, isExpanded }) {
  const hasPayload = payload && Object.keys(payload).length > 0;
  if (!hasPayload || !isExpanded) return null;

  function formatPayload(data) {
    if (typeof data === "string") return data;
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  }

  return (
    <div className="p-3 bg-ml-raised border border-ml-line rounded-[10px] overflow-x-auto">
      <pre className="text-[13.5px] text-ml-text-2 font-mono whitespace-pre-wrap break-words">
        {formatPayload(payload)}
      </pre>
    </div>
  );
}

function ToolApprovalResponseOption({
  approved,
  skillName,
  alwaysAllow,
  setAlwaysAllow,
  onApprove,
  onReject,
}) {
  const { t } = useTranslation();
  if (approved !== null) return null;

  return (
    <div className="flex flex-col gap-2.5 mt-1 pb-1">
      <div data-row="tool-approval" className="flex gap-2">
        <button
          type="button"
          onClick={onApprove}
          className="h-10 px-4 rounded-[11px] border-none bg-ml-accent-fill text-ml-on-accent font-semibold text-[14.5px] shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] hover:brightness-110 transition-[filter]"
        >
          {t("chat_window.agent_invocation.approve")}
        </button>
        <button
          type="button"
          onClick={onReject}
          className="h-10 px-4 rounded-[11px] border border-ml-line-2 bg-ml-raised text-ml-text font-semibold text-[14.5px] hover:border-ml-accent-line transition-colors"
        >
          {t("chat_window.agent_invocation.reject")}
        </button>
      </div>
      <label className="flex items-center gap-2 cursor-pointer text-ml-text-2 text-[14px] hover:text-ml-text transition-colors">
        <input
          type="checkbox"
          checked={alwaysAllow}
          onChange={(e) => setAlwaysAllow(e.target.checked)}
          className="w-4 h-4 rounded accent-[var(--ml-accent)] cursor-pointer"
        />
        <span>
          {t("chat_window.agent_invocation.always_allow", { skillName })}
        </span>
      </label>
    </div>
  );
}

function ToolApprovalResponseMessage({ approved }) {
  const { t } = useTranslation();

  if (approved === null) return null;
  if (approved === false) {
    return (
      <div className="flex items-center gap-1.5 text-[14.5px] font-medium text-ml-bad">
        <X size={16} weight="bold" />
        <span>{t("chat_window.agent_invocation.tool_call_was_rejected")}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-[14.5px] font-medium text-ml-ok">
      <Check size={16} weight="bold" />
      <span>{t("chat_window.agent_invocation.tool_call_was_approved")}</span>
    </div>
  );
}
