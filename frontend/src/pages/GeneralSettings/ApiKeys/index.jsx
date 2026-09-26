import { useEffect, useState } from "react";
import Sidebar from "@/components/SettingsSidebar";
import * as Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { PlusCircle } from "@phosphor-icons/react";
import Admin from "@/models/admin";
import ApiKeyRow from "./ApiKeyRow";
import NewApiKeyModal from "./NewApiKeyModal";
import paths from "@/utils/paths";
import { userFromStorage } from "@/utils/request";
import System from "@/models/system";
import Modal from "@/components/lib/Modal";
import { useModal } from "@/hooks/useModal";
import CTAButton from "@/components/lib/CTAButton";
import { useTranslation } from "react-i18next";

export default function AdminApiKeys() {
  const { isOpen, openModal, closeModal } = useModal();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [apiKeys, setApiKeys] = useState([]);

  const fetchExistingKeys = async () => {
    const user = userFromStorage();
    const Model = !!user ? Admin : System;
    const { apiKeys: foundKeys } = await Model.getApiKeys();
    setApiKeys(foundKeys);
    setLoading(false);
  };

  useEffect(() => {
    fetchExistingKeys();
  }, []);

  const removeApiKey = (id) => {
    setApiKeys((prevKeys) => prevKeys.filter((apiKey) => apiKey.id !== id));
  };

  return (
    <div className="w-screen h-screen overflow-hidden bg-theme-bg-container flex">
      <Sidebar />
      <div
        style={{ height: "100%" }}
        className="relative bg-theme-bg-primary w-full h-full overflow-y-scroll p-4 md:p-0"
      >
        <div className="flex flex-col w-full px-1 md:pl-6 md:pr-[50px] md:py-6 py-16">
          <div className="w-full flex flex-col gap-y-1 pb-6 border-white/10 border-b-2">
            <div className="items-center flex gap-x-4">
              <p className="text-lg leading-6 font-bold text-theme-text-primary">
                {t("api.title")}
              </p>
            </div>
            <p className="text-xs leading-[18px] font-base text-theme-text-secondary mt-2">
              {t("api.description")}
            </p>
            <a
              href={paths.apiDocs()}
              target="_blank"
              rel="noreferrer"
              className="text-xs leading-[18px] font-base text-ml-accent-text hover:underline mt-1"
            >
              {t("api.link")} &rarr;
            </a>
          </div>
          <div className="w-full justify-end flex">
            <CTAButton
              onClick={openModal}
              className="mt-3 mr-0 mb-4 md:-mb-14 z-10"
            >
              <PlusCircle className="h-4 w-4" weight="bold" />{" "}
              {t("api.generate")}
            </CTAButton>
          </div>
          <div className="overflow-x-auto mt-6">
            {loading ? (
              <Skeleton.default
                height="80vh"
                width="100%"
                highlightColor="var(--theme-bg-primary)"
                baseColor="var(--theme-bg-secondary)"
                count={1}
                className="w-full p-4 rounded-b-2xl rounded-tr-2xl rounded-tl-sm"
                containerClassName="flex w-full"
              />
            ) : (
              <table className="w-full text-xs text-left rounded-lg min-w-[720px] border-spacing-0 md:mt-6 mt-0">
                <thead className="text-theme-text-secondary text-xs leading-[18px] font-bold uppercase border-white/10 border-b">
                  <tr>
                    <th scope="col" className="px-6 py-3 rounded-tl-lg">
                      {t("api.table.name")}
                    </th>
                    <th scope="col" className="px-6 py-3">
                      {t("api.table.key")}
                    </th>
                    <th scope="col" className="px-6 py-3">
                      {t("api.table.by")}
                    </th>
                    <th scope="col" className="px-6 py-3">
                      {t("api.table.created")}
                    </th>
                    <th scope="col" className="px-6 py-3 rounded-tr-lg">
                      {t("api.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {apiKeys.length === 0 ? (
                    <tr className="bg-transparent text-theme-text-secondary text-sm font-medium">
                      <td colSpan="5" className="px-6 py-4 text-center">
                        {t("api.empty")}
                      </td>
                    </tr>
                  ) : (
                    apiKeys.map((apiKey) => (
                      <ApiKeyRow
                        key={apiKey.id}
                        apiKey={apiKey}
                        removeApiKey={removeApiKey}
                      />
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
        <Modal isOpen={isOpen} onClose={closeModal}>
          <NewApiKeyModal
            closeModal={closeModal}
            onSuccess={fetchExistingKeys}
          />
        </Modal>
      </div>
    </div>
  );
}
