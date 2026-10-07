import React from "react";
import { permissionGroups } from "../data/permissions.js";

function PermissionsEditor({ permissions, onChange, t }) {
  function togglePermission(permissionKey) {
    const nextPermissions = permissions.includes(permissionKey)
      ? permissions.filter((permission) => permission !== permissionKey)
      : [...permissions, permissionKey];

    onChange(nextPermissions);
  }

  return (
    <div className="permissions-editor">
      {permissionGroups.map((group) => (
        <fieldset className="permission-group" key={group.titleKey}>
          <legend>{t(group.titleKey)}</legend>
          {group.permissions.map((permission) => (
            <label className="checkbox-line" key={permission.key}>
              <input
                checked={permissions.includes(permission.key)}
                onChange={() => togglePermission(permission.key)}
                type="checkbox"
              />
              <span>{t(permission.labelKey)}</span>
            </label>
          ))}
        </fieldset>
      ))}
    </div>
  );
}

export default PermissionsEditor;
