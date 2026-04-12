/**
 * VoterGuide.jsx
 *
 * Voter Guide & Help page for the authenticated voter portal.
 * Provides step-by-step instructions for viewing candidates,
 * casting votes, downloading vote confirmation receipts, and
 * managing account access. No registration or login guidance —
 * this page is exclusively for verified, active voters.
 */

import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  Vote,
  Receipt,
  KeyRound,
  ChevronDown,
  BookOpen,
  Eye,
  ListChecks,
  CheckCircle2,
  ShieldCheck,
  Download,
  AlertTriangle,
  Info,
  Lightbulb,
  Clock,
  FileCheck,
  Lock,
  HelpCircle,
  ArrowRight,
  CircleDot,
} from "lucide-react";
import { useLanguage } from "../lib/LanguageContext";
import "./VoterGuide.css";

/* ── Palette (matches VoterShell / VoterDashboard) ──────────── */
const PALETTE = {
  navy: "#173B72",
  accentBlue: "#2F6FED",
  mutedText: "#64748B",
  surface: "#FFFFFF",
  appBg: "#F5F7FB",
  success: "#0F9F6E",
  warning: "#F59E0B",
  nepalRed: "#D42C3A",
  border: "#E2E8F0",
  lightBlueBg: "#EAF2FF",
};

/* ── Sidebar section anchors ────────────────────────────────── */
const SIDEBAR_SECTIONS = [
  { id: "candidates", label: "View Published Candidates", icon: Users },
  { id: "voting", label: "How to Vote", icon: Vote },
  { id: "after-vote", label: "After You Vote", icon: FileCheck },
  { id: "password", label: "Password Help", icon: KeyRound },
  { id: "faq", label: "Frequently Asked Questions", icon: HelpCircle },
];

/* ── FAQ data ───────────────────────────────────────────────── */
const FAQ_DATA = [
  {
    q: "When will candidates appear for an election?",
    a: "Candidates become visible only after the Election Commission publishes the official nomination list for that election. Until then, the candidate list will not be available. Check the Elections page for current status updates.",
  },
  {
    q: "Why can't I see a particular election?",
    a: "You can only see elections that you are eligible to participate in based on your registered constituency, province, and municipality. If an election is not visible, it may not be open yet, or it may not apply to your registered area.",
  },
  {
    q: "Can I vote in more than one election?",
    a: "Yes. You may be eligible to vote in federal, provincial, and local elections. Each election has its own ballot, and you cast your vote separately for each one. You can only vote once per election.",
  },
  {
    q: "How do I know my vote was submitted successfully?",
    a: "After you submit your ballot, a confirmation screen will appear showing your ballot ID and election details. This data is also saved to your Vote Receipt page, where you can view or download it at any time.",
  },
  {
    q: "Why does my vote confirmation not show who I voted for?",
    a: "To protect the secrecy of your ballot — a fundamental principle of democratic elections — your vote confirmation only proves that you participated. It does not reveal your selections. This ensures no one can verify or coerce your voting choices.",
  },
  {
    q: "Can I change my vote after submitting?",
    a: "No. Once you confirm and submit your ballot, your vote is final and cannot be changed or retracted. Please review your selections carefully on the confirmation screen before submitting.",
  },
  {
    q: "What should I do if I forget my password?",
    a: "If you are currently logged in, use the Change Password option in the Account & Security page. If you are logged out and cannot access your account, use the Forgot Password option on the login page to receive a password reset code via email.",
  },
  {
    q: "What should I do if a page is not loading properly?",
    a: "Try refreshing the page. If problems persist, clear your browser cache and try again. Ensure you have a stable internet connection. If the issue continues, contact the Election Commission helpdesk for assistance.",
  },
];

/* ════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════════════ */

export default function VoterGuide() {
  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (index) =>
    setOpenFaq((prev) => (prev === index ? null : index));

  return (
    <div className="vg-page">
      {/* ── Hero ──────────────────────────────────────────── */}
      <HeroSection />

      {/* ── Two-column layout ─────────────────────────────── */}
      <div className="vg-layout">
        {/* Main content */}
        <div className="vg-main">
          <CandidatesSection />
          <VotingSection />
          <AfterVoteSection />
          <PasswordSection />
          <FaqSection openFaq={openFaq} toggleFaq={toggleFaq} />
        </div>

        {/* Sticky sidebar */}
        <aside className="vg-sidebar">
          <QuickNavCard />
          <NeedHelpCard />
        </aside>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   HERO SECTION
   ════════════════════════════════════════════════════════════════ */

function HeroSection() {
  const { t } = useLanguage();
  return (
    <div
      style={{
        background: `linear-gradient(135deg, ${PALETTE.navy} 0%, ${PALETTE.accentBlue} 100%)`,
        borderRadius: 16,
        padding: "36px 40px 32px",
        color: "#FFF",
        marginBottom: 32,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Subtle decorative circles */}
      <div
        style={{
          position: "absolute",
          right: -40,
          top: -40,
          width: 180,
          height: 180,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.06)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          right: 60,
          bottom: -50,
          width: 120,
          height: 120,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.04)",
          pointerEvents: "none",
        }}
      />

      <div style={{ position: "relative" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 12,
          }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: "rgba(255,255,255,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <BookOpen size={22} color="#FFF" />
          </div>
          <h2
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: "-0.02em",
            }}
          >
            {t("guide.title")}
          </h2>
        </div>

        <p
          style={{
            margin: 0,
            fontSize: 14,
            opacity: 0.88,
            fontWeight: 500,
            lineHeight: 1.6,
            maxWidth: 560,
          }}
        >
          Learn how to view candidates, cast your vote, and download your vote
          confirmation. This guide covers everything you need to use the voter
          portal effectively.
        </p>

        {/* Quick action buttons */}
        <div className="vg-quick-actions">
          <Link to="/candidates" className="vg-action-btn" style={heroBtn}>
            <Users size={16} />
            View Candidates
          </Link>
          <Link to="/elections" className="vg-action-btn" style={heroBtn}>
            <Vote size={16} />
            Go to My Elections
          </Link>
          <Link to="/receipt" className="vg-action-btn" style={heroBtn}>
            <Receipt size={16} />
            Vote Confirmation
          </Link>
          <Link
            to="/change-password"
            className="vg-action-btn"
            style={heroBtn}
          >
            <KeyRound size={16} />
            Change Password
          </Link>
        </div>
      </div>
    </div>
  );
}

const heroBtn = {
  background: "rgba(255,255,255,0.14)",
  border: "1px solid rgba(255,255,255,0.22)",
  color: "#FFF",
  borderRadius: 10,
  padding: "11px 16px",
  fontWeight: 600,
  fontSize: 13,
  textDecoration: "none",
  display: "flex",
  alignItems: "center",
  gap: 9,
  transition: "all 0.2s ease",
};

/* ════════════════════════════════════════════════════════════════
   SECTION: VIEW PUBLISHED CANDIDATES
   ════════════════════════════════════════════════════════════════ */

function CandidatesSection() {
  const steps = [
    {
      num: 1,
      icon: <Vote size={20} color={PALETTE.accentBlue} />,
      title: "Open Elections or Candidates",
      desc: "Navigate to the Candidates page from the sidebar, or select a specific election first.",
    },
    {
      num: 2,
      icon: <ListChecks size={20} color={PALETTE.accentBlue} />,
      title: "Select an Election",
      desc: "Choose the specific election (federal, provincial, or local) you want to view candidates for.",
    },
    {
      num: 3,
      icon: <Eye size={20} color={PALETTE.accentBlue} />,
      title: "View Published Candidates",
      desc: "Once nominations are published, the candidate list for that election will be visible.",
    },
    {
      num: 4,
      icon: <CheckCircle2 size={20} color={PALETTE.accentBlue} />,
      title: "Review Candidate Details",
      desc: "View candidate profiles, party affiliations, and election-specific details before voting.",
    },
  ];

  return (
    <section id="candidates" style={{ marginBottom: 40, scrollMarginTop: 96 }}>
      <SectionHeader
        icon={<Users size={20} color={PALETTE.accentBlue} />}
        title="View Published Candidates"
        description="Candidates appear only after the Election Commission publishes the official nomination list for a specific election. You will see candidates relevant to the elections you are eligible for — not a global list."
      />

      <Callout
        type="info"
        text="Candidate lists are election-specific. Federal elections show federal candidates for your constituency, provincial elections show your provincial candidates, and local elections show candidates for your municipality and ward."
      />

      <div className="vg-step-grid" style={{ marginTop: 18 }}>
        {steps.map((step) => (
          <StepCard key={step.num} {...step} />
        ))}
      </div>

      <div style={{ marginTop: 16, textAlign: "right" }}>
        <Link
          to="/candidates"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            color: PALETTE.accentBlue,
            fontWeight: 600,
            fontSize: 13,
            textDecoration: "none",
          }}
        >
          Go to Candidates
          <ArrowRight size={14} />
        </Link>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════
   SECTION: HOW TO VOTE
   ════════════════════════════════════════════════════════════════ */

function VotingSection() {
  const steps = [
    {
      title: "Open the election",
      desc: "From your Dashboard or the Elections page, find the election you wish to vote in and open it. Only elections with status \u201cPolling Open\u201d accept votes.",
      tip: null,
    },
    {
      title: "Confirm the election details",
      desc: "Verify the election name, type (federal, provincial, or local), and your constituency information to ensure you are voting in the correct election.",
      tip: null,
    },
    {
      title: "Review the ballot",
      desc: "The ballot will display nominated candidates and parties for that election. Take time to review all available options before making your selections.",
      tip: "For local elections, you may see separate sections for different positions (e.g., Mayor, Deputy Mayor, Ward Chair). Each section requires a selection.",
    },
    {
      title: "Make your selection",
      desc: "Select your preferred candidate or party for each ballot section. Your selections will be highlighted on screen.",
      tip: null,
    },
    {
      title: "Review before final submission",
      desc: "A confirmation screen will show your selected candidates and parties. Review every selection carefully. This is your last chance to make changes.",
      important:
        "Once you confirm and submit, your vote is final and cannot be changed or retracted. Please verify your selections thoroughly.",
    },
    {
      title: "Submit your vote",
      desc: 'Click "Confirm & Cast" to submit your ballot. The system will securely record your vote.',
      tip: null,
    },
    {
      title: "Wait for confirmation",
      desc: "After submission, a success screen will appear with your ballot ID and election details. Do not close the browser until you see this confirmation.",
      tip: null,
    },
    {
      title: "Save your vote confirmation",
      desc: "Your vote confirmation is automatically saved to the Vote Receipt page. You can visit it anytime to verify your participation or download the receipt.",
      tip: null,
    },
  ];

  return (
    <section id="voting" style={{ marginBottom: 40, scrollMarginTop: 96 }}>
      <SectionHeader
        icon={<Vote size={20} color={PALETTE.accentBlue} />}
        title="How to Vote"
        description="Follow these steps to cast your vote securely. The process is designed to be straightforward, but please read each step carefully."
      />

      <div className="vg-stepper">
        {steps.map((step, idx) => (
          <StepperItem
            key={idx}
            number={idx + 1}
            isLast={idx === steps.length - 1}
            {...step}
          />
        ))}
      </div>

      <div style={{ marginTop: 16, textAlign: "right" }}>
        <Link
          to="/elections"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            color: PALETTE.accentBlue,
            fontWeight: 600,
            fontSize: 13,
            textDecoration: "none",
          }}
        >
          Go to Elections
          <ArrowRight size={14} />
        </Link>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════
   SECTION: AFTER YOU VOTE
   ════════════════════════════════════════════════════════════════ */

function AfterVoteSection() {
  return (
    <section id="after-vote" style={{ marginBottom: 40, scrollMarginTop: 96 }}>
      <SectionHeader
        icon={<FileCheck size={20} color={PALETTE.success} />}
        title="After You Vote"
        description="Once your vote is submitted, here's what to expect and how to access your vote confirmation."
      />

      {/* Status & receipt info cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: 14,
          marginBottom: 20,
        }}
      >
        <InfoCard
          icon={<CheckCircle2 size={20} color={PALETTE.success} />}
          title="Vote Confirmed"
          text='After submitting, you will see a confirmation screen with a "Ballot Cast Successfully" message and your unique ballot ID. This confirms your vote was recorded.'
        />
        <InfoCard
          icon={<Clock size={20} color={PALETTE.warning} />}
          title="Vote Status"
          text="Visit the Elections page to see the status of elections you've voted in. Your participation is marked with a checkmark badge."
        />
        <InfoCard
          icon={<Download size={20} color={PALETTE.accentBlue} />}
          title="Download Receipt"
          text="Go to the Vote Receipt page to view all your vote confirmations and download them for your records at any time."
        />
      </div>

      {/* Vote Confirmation Card */}
      <div
        style={{
          background: PALETTE.surface,
          borderRadius: 14,
          border: `1px solid ${PALETTE.border}`,
          padding: "28px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 4,
            background: PALETTE.success,
            borderRadius: "14px 0 0 14px",
          }}
        />

        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 16,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "#F0FDF4",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <ShieldCheck size={22} color={PALETTE.success} />
          </div>
          <div>
            <h4
              style={{
                margin: "0 0 6px",
                fontSize: 16,
                fontWeight: 700,
                color: PALETTE.navy,
              }}
            >
              Your Vote Confirmation Receipt
            </h4>
            <p
              style={{
                margin: 0,
                fontSize: 13.5,
                color: PALETTE.mutedText,
                lineHeight: 1.6,
                fontWeight: 500,
              }}
            >
              Your vote confirmation receipt serves as proof that you
              participated in an election. It includes the following
              information:
            </p>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
            gap: 8,
            marginBottom: 20,
            paddingLeft: 60,
          }}
        >
          {[
            "Election name",
            "Election type",
            "Date & time submitted",
            "Ballot / reference ID",
            "Vote status",
            "Constituency / area",
          ].map((item) => (
            <div
              key={item}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 13,
                fontWeight: 500,
                color: "#374151",
              }}
            >
              <CheckCircle2 size={14} color={PALETTE.success} />
              {item}
            </div>
          ))}
        </div>

        {/* Privacy note */}
        <div
          style={{
            background: "#FFFBEB",
            borderRadius: 10,
            border: "1px solid #FDE68A",
            padding: "14px 18px",
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
          }}
        >
          <Lock
            size={16}
            color="#D97706"
            style={{ flexShrink: 0, marginTop: 2 }}
          />
          <p
            style={{
              margin: 0,
              fontSize: 13,
              color: "#92400E",
              lineHeight: 1.6,
              fontWeight: 500,
            }}
          >
            <strong>Ballot secrecy:</strong> Your vote confirmation does not
            reveal who or what you voted for. This is by design — the secrecy of
            your ballot is a fundamental right in democratic elections. No
            receipt, document, or system output will ever disclose your
            selections.
          </p>
        </div>

        <div style={{ marginTop: 20 }}>
          <Link
            to="/receipt"
            className="vg-action-btn primary"
            style={{ display: "inline-flex" }}
          >
            <Receipt size={16} />
            View Vote Receipts
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════
   SECTION: PASSWORD HELP
   ════════════════════════════════════════════════════════════════ */

function PasswordSection() {
  return (
    <section id="password" style={{ marginBottom: 40, scrollMarginTop: 96 }}>
      <SectionHeader
        icon={<KeyRound size={20} color={PALETTE.accentBlue} />}
        title="Password Help"
        description="If you need to update your password or have trouble accessing your account, use the options below."
      />

      <div
        style={{
          background: PALETTE.surface,
          borderRadius: 14,
          border: `1px solid ${PALETTE.border}`,
          padding: "24px 28px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 20,
          }}
        >
          {/* Change Password */}
          <div>
            <h4
              style={{
                margin: "0 0 6px",
                fontSize: 14,
                fontWeight: 700,
                color: PALETTE.navy,
              }}
            >
              Change Your Password
            </h4>
            <p
              style={{
                margin: "0 0 14px",
                fontSize: 13,
                color: PALETTE.mutedText,
                lineHeight: 1.6,
                fontWeight: 500,
              }}
            >
              Update your password while you are logged in. You will need your
              current password to set a new one. All other sessions will be
              signed out.
            </p>
            <Link to="/change-password" className="vg-action-btn">
              <KeyRound size={15} />
              Change Password
            </Link>
          </div>

          {/* Forgot Password (info only) */}
          <div>
            <h4
              style={{
                margin: "0 0 6px",
                fontSize: 14,
                fontWeight: 700,
                color: PALETTE.navy,
              }}
            >
              Forgot Your Password?
            </h4>
            <p
              style={{
                margin: "0 0 14px",
                fontSize: 13,
                color: PALETTE.mutedText,
                lineHeight: 1.6,
                fontWeight: 500,
              }}
            >
              If you are logged out and cannot access your account, use the
              "Forgot Password" option on the login page. A reset code will be
              sent to your registered email.
            </p>
            <Link to="/account" className="vg-action-btn">
              <ShieldCheck size={15} />
              Account & Security
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════
   SECTION: FAQ
   ════════════════════════════════════════════════════════════════ */

function FaqSection({ openFaq, toggleFaq }) {
  return (
    <section id="faq" style={{ marginBottom: 24, scrollMarginTop: 96 }}>
      <SectionHeader
        icon={<HelpCircle size={20} color={PALETTE.accentBlue} />}
        title="Frequently Asked Questions"
        description="Quick answers to common questions about using the voter portal."
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {FAQ_DATA.map((item, idx) => (
          <div
            key={idx}
            className={`vg-faq-item${openFaq === idx ? " open" : ""}`}
          >
            <button
              className="vg-faq-trigger"
              onClick={() => toggleFaq(idx)}
              aria-expanded={openFaq === idx}
            >
              <span>{item.q}</span>
              <ChevronDown size={16} className="vg-faq-chevron" />
            </button>
            <div className="vg-faq-body">
              <div className="vg-faq-answer">{item.a}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════
   SIDEBAR COMPONENTS
   ════════════════════════════════════════════════════════════════ */

function QuickNavCard() {
  return (
    <div
      style={{
        background: PALETTE.surface,
        borderRadius: 14,
        border: `1px solid ${PALETTE.border}`,
        padding: "20px",
      }}
    >
      <h4
        style={{
          margin: "0 0 14px",
          fontSize: 13,
          fontWeight: 700,
          color: PALETTE.navy,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}
      >
        On This Page
      </h4>

      <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {SIDEBAR_SECTIONS.map((sec) => {
          const IconComp = sec.icon;
          return (
            <a
              key={sec.id}
              href={`#${sec.id}`}
              className="vg-sidebar-link"
            >
              <IconComp size={16} color={PALETTE.mutedText} />
              {sec.label}
            </a>
          );
        })}
      </nav>
    </div>
  );
}

function NeedHelpCard() {
  return (
    <div
      style={{
        background: PALETTE.lightBlueBg,
        borderRadius: 14,
        border: "1px solid #C7D8F8",
        padding: "20px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 10,
        }}
      >
        <HelpCircle size={18} color={PALETTE.accentBlue} />
        <h4
          style={{
            margin: 0,
            fontSize: 14,
            fontWeight: 700,
            color: PALETTE.navy,
          }}
        >
          Quick Links
        </h4>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <Link to="/elections" className="vg-action-btn" style={{ fontSize: 12 }}>
          <Vote size={14} />
          My Elections
        </Link>
        <Link to="/candidates" className="vg-action-btn" style={{ fontSize: 12 }}>
          <Users size={14} />
          View Candidates
        </Link>
        <Link to="/receipt" className="vg-action-btn" style={{ fontSize: 12 }}>
          <Receipt size={14} />
          Vote Receipts
        </Link>
        <Link
          to="/change-password"
          className="vg-action-btn"
          style={{ fontSize: 12 }}
        >
          <KeyRound size={14} />
          Change Password
        </Link>
        <Link to="/account" className="vg-action-btn" style={{ fontSize: 12 }}>
          <ShieldCheck size={14} />
          Account & Security
        </Link>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   SHARED UI COMPONENTS
   ════════════════════════════════════════════════════════════════ */

/** Section header with icon, title, and description */
function SectionHeader({ icon, title, description }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div
        style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: PALETTE.lightBlueBg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        <h3
          style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 800,
            color: PALETTE.navy,
            letterSpacing: "-0.01em",
          }}
        >
          {title}
        </h3>
      </div>
      {description && (
        <p
          style={{
            margin: "0 0 0 46px",
            fontSize: 13.5,
            color: PALETTE.mutedText,
            lineHeight: 1.6,
            fontWeight: 500,
          }}
        >
          {description}
        </p>
      )}
    </div>
  );
}

/** Horizontal step card */
function StepCard({ num, icon, title, desc }) {
  return (
    <div
      style={{
        background: PALETTE.surface,
        borderRadius: 12,
        border: `1px solid ${PALETTE.border}`,
        padding: "20px 18px",
        position: "relative",
        transition: "border-color 0.2s ease, box-shadow 0.2s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = PALETTE.accentBlue + "40";
        e.currentTarget.style.boxShadow =
          "0 4px 12px rgba(47,111,237,0.06)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = PALETTE.border;
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 10,
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: PALETTE.lightBlueBg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            fontWeight: 800,
            color: PALETTE.accentBlue,
          }}
        >
          {num}
        </div>
        {icon}
      </div>
      <h4
        style={{
          margin: "0 0 6px",
          fontSize: 13.5,
          fontWeight: 700,
          color: PALETTE.navy,
        }}
      >
        {title}
      </h4>
      <p
        style={{
          margin: 0,
          fontSize: 12.5,
          color: PALETTE.mutedText,
          lineHeight: 1.55,
          fontWeight: 500,
        }}
      >
        {desc}
      </p>
    </div>
  );
}

/** Vertical stepper item */
function StepperItem({ number, title, desc, tip, important, isLast }) {
  return (
    <div style={{ display: "flex", gap: 18, minHeight: isLast ? "auto" : 0 }}>
      {/* Timeline column */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: 36,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background:
              number === 6
                ? PALETTE.accentBlue
                : PALETTE.lightBlueBg,
            color: number === 6 ? "#FFF" : PALETTE.accentBlue,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
            fontWeight: 800,
            flexShrink: 0,
            border:
              number === 6
                ? "none"
                : `2px solid ${PALETTE.accentBlue}30`,
          }}
        >
          {number}
        </div>
        {!isLast && (
          <div
            style={{
              width: 2,
              flex: 1,
              minHeight: 20,
              background: `${PALETTE.accentBlue}20`,
              marginTop: 4,
              marginBottom: 4,
              borderRadius: 1,
            }}
          />
        )}
      </div>

      {/* Content */}
      <div
        style={{
          paddingBottom: isLast ? 0 : 24,
          flex: 1,
          minWidth: 0,
        }}
      >
        <h4
          style={{
            margin: "4px 0 6px",
            fontSize: 14.5,
            fontWeight: 700,
            color: PALETTE.navy,
          }}
        >
          {title}
        </h4>
        <p
          style={{
            margin: 0,
            fontSize: 13.5,
            color: "#475569",
            lineHeight: 1.65,
            fontWeight: 500,
          }}
        >
          {desc}
        </p>

        {tip && (
          <Callout type="tip" text={tip} style={{ marginTop: 10 }} />
        )}
        {important && (
          <Callout
            type="warning"
            text={important}
            style={{ marginTop: 10 }}
          />
        )}
      </div>
    </div>
  );
}

/** Compact info card */
function InfoCard({ icon, title, text }) {
  return (
    <div
      style={{
        background: PALETTE.surface,
        borderRadius: 12,
        border: `1px solid ${PALETTE.border}`,
        padding: "20px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 10,
        }}
      >
        {icon}
        <h4
          style={{
            margin: 0,
            fontSize: 14,
            fontWeight: 700,
            color: PALETTE.navy,
          }}
        >
          {title}
        </h4>
      </div>
      <p
        style={{
          margin: 0,
          fontSize: 13,
          color: PALETTE.mutedText,
          lineHeight: 1.6,
          fontWeight: 500,
        }}
      >
        {text}
      </p>
    </div>
  );
}

/** Callout box for tips, info, and warnings */
function Callout({ type, text, style: wrapStyle }) {
  const configs = {
    info: {
      bg: "#EFF6FF",
      border: "#BFDBFE",
      color: "#1E40AF",
      icon: <Info size={15} color="#3B82F6" />,
    },
    tip: {
      bg: "#F0FDF4",
      border: "#BBF7D0",
      color: "#166534",
      icon: <Lightbulb size={15} color="#16A34A" />,
    },
    warning: {
      bg: "#FEF2F2",
      border: "#FECACA",
      color: "#991B1B",
      icon: <AlertTriangle size={15} color="#DC2626" />,
    },
  };

  const cfg = configs[type] || configs.info;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        padding: "12px 16px",
        borderRadius: 10,
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        ...wrapStyle,
      }}
    >
      <span style={{ flexShrink: 0, marginTop: 1 }}>{cfg.icon}</span>
      <p
        style={{
          margin: 0,
          fontSize: 13,
          color: cfg.color,
          lineHeight: 1.6,
          fontWeight: 500,
        }}
      >
        {text}
      </p>
    </div>
  );
}
