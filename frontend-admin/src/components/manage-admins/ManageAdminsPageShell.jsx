import React from "react";

// Standard page shell for admin-management screens.
export default function ManageAdminsPageShell({ children }) {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="pb-8 border-b border-gray-200">
        <h1 className="text-3xl font-bold leading-tight tracking-tight text-gray-900">
          Administrator Access Control
        </h1>
        <p className="mt-2 max-w-4xl text-base text-gray-500">
          Manage administrator accounts, pending approvals, and security events for the entire system.
        </p>
      </div>
      <main className="pt-10">{children}</main>
    </div>
  );
}