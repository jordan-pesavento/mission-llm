import Modal, { ModalHeader, ModalBody } from "@/components/lib/Modal";
import { useModal } from "@/hooks/useModal";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { MENU_ROW } from "../../chatUi";

const SEEN_COPY_LINK_CHAT_ALERT = "missionllm_seen_copy_link_chat_alert";

export default function CopyLinkToChatRow() {
  const { slug, threadSlug } = useParams();
  const [copied, setCopied] = useState(false);
  const { isOpen, openModal, closeModal } = useModal();

  if (!slug) return null;

  function getChatUrl() {
    let path = `/workspace/${slug}`;
    if (threadSlug) path += `/t/${threadSlug}`;
    return `${window.location.origin}${path}`;
  }

  function handleClick() {
    navigator.clipboard.writeText(getChatUrl()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });

    if (!window.localStorage.getItem(SEEN_COPY_LINK_CHAT_ALERT)) {
      window.localStorage.setItem(SEEN_COPY_LINK_CHAT_ALERT, "1");
      openModal();
    }
  }

  return (
    <>
      <button
        type="button"
        role="menuitem"
        onClick={handleClick}
        className={MENU_ROW}
      >
        <span>{copied ? "Link copied!" : "Copy chat link"}</span>
      </button>
      <CopyLinkModal
        isOpen={isOpen}
        closeModal={closeModal}
        url={getChatUrl()}
      />
    </>
  );
}

function CopyLinkModal({ isOpen, closeModal, url }) {
  return (
    <Modal isOpen={isOpen} onClose={closeModal}>
      <ModalHeader title="Chat link copied!" onClose={closeModal} />
      <ModalBody>
        <p className="text-[15px] text-ml-text-2">
          The link to this chat has been copied to your clipboard.
        </p>
        <p className="text-[15px] text-ml-text-2">
          This <strong>does not</strong> change permissions on the chat and is
          simply a way for you to quick link to you own chats.
        </p>
        <div className="px-3 py-2 rounded-[10px] bg-ml-panel border border-ml-line-2 font-mono text-[14px] text-ml-text break-all select-all">
          {url}
        </div>
      </ModalBody>
    </Modal>
  );
}
