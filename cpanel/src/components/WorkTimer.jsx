import React from "react";

function formatElapsed(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((unit) => String(unit).padStart(2, "0"))
    .join(":");
}

function WorkTimer({ compact = false, session, t }) {
  const [now, setNow] = React.useState(Date.now());

  React.useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (!session?.loginTime) {
    return null;
  }

  const endTime = session.logoutTime
    ? new Date(session.logoutTime).getTime()
    : now;
  const elapsed = endTime - new Date(session.loginTime).getTime();

  return (
    <div className={compact ? "work-timer compact" : "work-timer"}>
      <span>{t("admin.todayWorkTime")}</span>
      <strong>{formatElapsed(elapsed)}</strong>
    </div>
  );
}

export default WorkTimer;
