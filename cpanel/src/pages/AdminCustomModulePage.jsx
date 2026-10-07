import React from "react";
import { LoaderCircle, Settings2 } from "lucide-react";
import AdminLayout from "../components/AdminLayout.jsx";
import CustomModuleEntriesWorkspace from "../components/CustomModuleEntriesWorkspace.jsx";
import { fetchCustomModule } from "../utils/customModulesApi.js";
import {
  canViewCustomModule,
  customModuleWorkspaceCopy,
  isEnabledCustomModule,
  parseCustomModuleKeyFromPage,
  parseCustomModuleKeyFromPath,
  unitCreatorCopy,
} from "../utils/customModulesUi.js";

export default function AdminCustomModulePage({
  activePage,
  company,
  currentUser,
  language = "en",
  ...layoutProps
}) {
  const copy = customModuleWorkspaceCopy(language);
  const listCopy = unitCreatorCopy(language);
  const dir = language === "ar" ? "rtl" : "ltr";
  const moduleKey = parseCustomModuleKeyFromPage(activePage)
    || parseCustomModuleKeyFromPath(typeof window !== "undefined" ? window.location.pathname : "");
  const [module, setModule] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [forbidden, setForbidden] = React.useState(false);
  const [notFound, setNotFound] = React.useState(false);
  const [unavailable, setUnavailable] = React.useState(false);
  const requestRef = React.useRef(0);

  const load = React.useCallback(() => {
    const requestId = ++requestRef.current;
    if (!moduleKey) {
      setModule(null);
      setNotFound(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    setForbidden(false);
    setNotFound(false);
    setUnavailable(false);
    fetchCustomModule(moduleKey)
      .then((data) => {
        if (requestRef.current !== requestId) return;
        if (!isEnabledCustomModule(data)) {
          setModule(null);
          setUnavailable(true);
          setLoading(false);
          return;
        }
        if (!canViewCustomModule(currentUser, data)) {
          setModule(null);
          setForbidden(true);
          setLoading(false);
          return;
        }
        setModule(data);
        setLoading(false);
      })
      .catch((requestError) => {
        if (requestRef.current !== requestId) return;
        setModule(null);
        const message = String(requestError?.message || "");
        const disabledByServer = requestError?.status === 403
          && /not enabled/i.test(message);
        setUnavailable(disabledByServer);
        setForbidden(requestError?.status === 403 && !disabledByServer);
        setNotFound(requestError?.status === 404);
        setError(
          requestError?.status === 403 || requestError?.status === 404
            ? ""
            : (requestError?.message || copy.loadFailed),
        );
        setLoading(false);
      });
  }, [copy.loadFailed, currentUser, moduleKey]);

  React.useEffect(() => {
    load();
    return () => { requestRef.current += 1; };
  }, [company?.id, load]);

  const title = module?.label || moduleKey || listCopy.title;

  return (
    <AdminLayout activePage={activePage} subtitle={module?.description || listCopy.subtitle} title={title} {...layoutProps}>
      <section className="unit-creator-page custom-module-page" dir={dir}>
        {loading && (
          <div className="unit-creator-loading"><LoaderCircle className="spin" size={28} /><span>{copy.loading}</span></div>
        )}
        {!loading && forbidden && (
          <div className="unit-creator-forbidden"><Settings2 size={28} /><strong>{copy.forbidden}</strong></div>
        )}
        {!loading && notFound && (
          <div className="unit-creator-empty"><strong>{copy.notFound}</strong></div>
        )}
        {!loading && unavailable && (
          <div className="unit-creator-empty"><strong>{copy.unavailable}</strong></div>
        )}
        {!loading && error && (
          <div className="unit-creator-error" role="alert">
            <span>{error}</span>
            <button className="secondary-action" onClick={load} type="button">{copy.retry}</button>
          </div>
        )}
        {!loading && !error && !forbidden && !notFound && !unavailable && module && (
          <div className="unit-creator-main">
            <CustomModuleEntriesWorkspace
              currentUser={currentUser}
              language={language}
              module={module}
            />
          </div>
        )}
      </section>
    </AdminLayout>
  );
}
