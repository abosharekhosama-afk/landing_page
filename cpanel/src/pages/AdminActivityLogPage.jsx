import React from "react";
import AdminLayout from "../components/AdminLayout.jsx";
import ActivityLogWorkspace, { ACTIVITY_LOG_COPY } from "../components/ActivityLogWorkspace.jsx";

export default function AdminActivityLogPage({ company, currentUser, language = "en", ...layoutProps }) {
  const copy = ACTIVITY_LOG_COPY[language] || ACTIVITY_LOG_COPY.en;
  return (
    <AdminLayout
      activePage="admin-activity-log"
      company={company}
      currentUser={currentUser}
      language={language}
      subtitle={copy.subtitle}
      title={copy.title}
      {...layoutProps}
    >
      <ActivityLogWorkspace company={company} currentUser={currentUser} language={language} />
    </AdminLayout>
  );
}
