import Workspace from "@/models/workspace";
import { castToType } from "@/utils/types";
import showToast from "@/utils/toast";
import { useEffect, useRef, useState } from "react";
import WorkspaceName from "./WorkspaceName";
import WorkspaceIcon from "./WorkspaceIcon";
import SuggestedChatMessages from "./SuggestedChatMessages";
import DeleteWorkspace from "./DeleteWorkspace";
import CTAButton from "@/components/lib/CTAButton";
import { announceWorkspaceUpdate } from "@/components/WorkspaceTile";

const FORM_ID = "workspace-general-form";

export default function GeneralInfo({ slug, deletionProtected = false }) {
  const [workspace, setWorkspace] = useState(null);
  const [draftName, setDraftName] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const formEl = useRef(null);

  useEffect(() => {
    async function fetchWorkspace() {
      const workspace = await Workspace.bySlug(slug);
      setWorkspace(workspace);
      setDraftName(workspace?.name ?? "");
      setLoading(false);
    }
    fetchWorkspace();
  }, [slug]);

  const handleUpdate = async (e) => {
    setSaving(true);
    e.preventDefault();
    const data = {};
    const form = new FormData(formEl.current);
    for (var [key, value] of form.entries()) data[key] = castToType(key, value);
    const { workspace: updatedWorkspace, message } = await Workspace.update(
      workspace.slug,
      data
    );
    if (!!updatedWorkspace) {
      showToast("Workspace updated!", "success", { clear: true });
      setWorkspace((prev) => ({ ...prev, ...updatedWorkspace }));
      // The rail and the headers pick up the new name and icon right away.
      announceWorkspaceUpdate(updatedWorkspace);
      setHasChanges(false);
    } else {
      showToast(`Error: ${message}`, "error", { clear: true });
    }
    setSaving(false);
  };

  if (!workspace || loading) return null;
  return (
    <div className="w-full relative flex flex-col gap-y-[32px]">
      {hasChanges && (
        // Top right of the page, and it stays in view while the page is
        // scrolled (the icon library makes the page long), below the
        // floating account avatar. Takes no room.
        <div className="sticky top-[calc(var(--ml-topbar-h)+8px)] z-20 h-0 -mb-[32px] flex justify-end">
          <CTAButton type="submit" form={FORM_ID}>
            {saving ? "Updating..." : "Update Workspace"}
          </CTAButton>
        </div>
      )}
      <form
        id={FORM_ID}
        ref={formEl}
        onSubmit={handleUpdate}
        className="w-1/2 flex flex-col gap-y-[32px]"
      >
        <WorkspaceName
          key={workspace.slug}
          workspace={workspace}
          setHasChanges={setHasChanges}
          onNameChange={setDraftName}
        />
        <WorkspaceIcon
          key={`${workspace.slug}-icon`}
          workspace={workspace}
          name={draftName.trim() || workspace.name}
          setHasChanges={setHasChanges}
        />
      </form>
      <SuggestedChatMessages slug={workspace.slug} />
      <DeleteWorkspace workspace={workspace} visible={!deletionProtected} />
    </div>
  );
}
