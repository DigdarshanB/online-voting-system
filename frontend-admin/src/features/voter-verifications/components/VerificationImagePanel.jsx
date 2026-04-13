import React from "react";
import ArtifactPreviewCard from "./ArtifactPreviewCard";

export default function VerificationImagePanel({ userId }) {
  return (
    <div style={{
      display: "flex",
      gap: 16,
      flexWrap: "wrap",
      marginBottom: 24,
    }}>
      <ArtifactPreviewCard
        title="Government Document"
        subtitle="Citizenship certificate"
        userId={userId}
        endpoint="document"
        alt="Voter citizenship document"
      />
      <ArtifactPreviewCard
        title="Live Capture"
        subtitle="Face photo at submission"
        userId={userId}
        endpoint="face"
        alt="Voter live face photo"
      />
    </div>
  );
}
