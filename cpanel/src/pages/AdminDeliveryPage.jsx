import React from "react";
import AdminLayout from "../components/AdminLayout.jsx";
import DeliveryZonesWorkspace, { deliveryZoneLabels } from "../components/DeliveryZonesWorkspace.jsx";

export default function AdminDeliveryPage({ company, currentUser, language = "en", ...layoutProps }) {
  const copy = deliveryZoneLabels[language] || deliveryZoneLabels.en;
  return (
    <AdminLayout
      activePage="admin-delivery"
      company={company}
      currentUser={currentUser}
      language={language}
      subtitle={copy.subtitle}
      title={copy.title}
      {...layoutProps}
    >
      <DeliveryZonesWorkspace company={company} currentUser={currentUser} language={language} />
    </AdminLayout>
  );
}
