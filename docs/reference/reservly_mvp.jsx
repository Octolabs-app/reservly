import { useState, useEffect } from "react";

// ─── TOKENS ────────────────────────────────────────────────────────────────────
const T = {
  primary: "#4F46E5",
  primaryHover: "#4338CA",
  primaryLight: "#EEF2FF",
  primaryMid: "#C7D2FE",
  success: "#059669",
  successLight: "#ECFDF5",
  warning: "#D97706",
  warningLight: "#FFFBEB",
  danger: "#DC2626",
  dangerLight: "#FEF2F2",
  dark: "#0F172A",
  body: "#334155",
  mid: "#64748B",
  muted: "#94A3B8",
  border: "#E2E8F0",
  borderLight: "#F1F5F9",
  surface: "#F8FAFC",
  white: "#FFFFFF",
};

// ─── TINY HELPERS ──────────────────────────────────────────────────────────────
const px = (n) => `${n}px`;

const shadow = {
  sm: "0 1px 3px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.04)",
  md: "0 4px 12px rgba(0,0,0,.08)",
  lg: "0 8px 32px rgba(0,0,0,.10)",
};

// ─── ATOMS ─────────────────────────────────────────────────────────────────────

const Tag = ({ children, color = T.primary, bg }) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      padding: "2px 9px",
      borderRadius: 999,
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: ".03em",
      color,
      background: bg ?? color + "18",
      border: `1px solid ${color}28`,
      whiteSpace: "nowrap",
    }}
  >
    {children}
  </span>
);

const Pill = ({ children, active, onClick, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      padding: "8px 6px",
      minWidth: 52,
      borderRadius: 11,
      cursor: disabled ? "default" : onClick ? "pointer" : "default",
      border: `1.5px solid ${active ? T.primary : T.border}`,
      background: active ? T.primary : disabled ? T.surface : T.white,
      color: active ? T.white : disabled ? T.muted : T.dark,
      fontSize: 13,
      fontWeight: active ? 600 : 400,
      opacity: disabled ? 0.45 : 1,
      transition: "all .15s",
      textAlign: "center",
      outline: "none",
    }}
  >
    {children}
  </button>
);

const Btn = ({
  children,
  variant = "primary",
  full,
  onClick,
  style = {},
  size = "md",
  disabled,
}) => {
  const base =
    {
      primary: { bg: T.primary, fg: T.white, bdr: "none" },
      success: { bg: T.success, fg: T.white, bdr: "none" },
      outline: { bg: "transparent", fg: T.primary, bdr: `1.5px solid ${T.primary}` },
      ghost: { bg: T.surface, fg: T.mid, bdr: `1px solid ${T.border}` },
      danger: { bg: T.dangerLight, fg: T.danger, bdr: `1px solid ${T.danger}30` },
    }[variant] ?? {};
  const pad = size === "sm" ? "7px 14px" : "11px 20px";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: pad,
        borderRadius: 10,
        border: base.bdr,
        background: disabled ? T.border : base.bg,
        color: disabled ? T.mid : base.fg,
        fontSize: size === "sm" ? 12 : 13,
        fontWeight: 500,
        cursor: disabled ? "default" : "pointer",
        width: full ? "100%" : "auto",
        transition: "opacity .15s, background .15s",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        ...style,
      }}
    >
      {children}
    </button>
  );
};

const Input = ({ label, placeholder, prefix, value, onChange, type = "text", note }) => (
  <div style={{ marginBottom: 14 }}>
    {label && (
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: T.mid,
          marginBottom: 5,
          textTransform: "uppercase",
          letterSpacing: ".06em",
        }}
      >
        {label}
      </div>
    )}
    <div
      style={{
        display: "flex",
        alignItems: "center",
        border: `1.5px solid ${T.border}`,
        borderRadius: 10,
        overflow: "hidden",
        background: T.white,
        transition: "border-color .15s",
      }}
    >
      {prefix && (
        <span
          style={{
            padding: "10px 12px",
            background: T.surface,
            fontSize: 13,
            color: T.mid,
            borderRight: `1px solid ${T.border}`,
            whiteSpace: "nowrap",
          }}
        >
          {prefix}
        </span>
      )}
      <input
        type={type}
        placeholder={placeholder}
        value={value ?? ""}
        onChange={onChange}
        style={{
          flex: 1,
          padding: "10px 12px",
          border: "none",
          outline: "none",
          fontSize: 14,
          color: T.dark,
          background: "transparent",
          fontFamily: "inherit",
        }}
      />
    </div>
    {note && <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>{note}</div>}
  </div>
);

const ProgressBar = ({ steps, current }) => (
  <div style={{ display: "flex", gap: 4 }}>
    {Array.from({ length: steps }, (_, i) => (
      <div
        key={i}
        style={{
          flex: 1,
          height: 3,
          borderRadius: 999,
          background: i < current ? T.primary : "rgba(255,255,255,.3)",
          transition: "background .25s",
        }}
      />
    ))}
  </div>
);

const Card = ({ children, style = {} }) => (
  <div
    style={{
      background: T.white,
      borderRadius: 14,
      border: `1px solid ${T.border}`,
      boxShadow: shadow.sm,
      ...style,
    }}
  >
    {children}
  </div>
);

const SectionLabel = ({ children }) => (
  <div
    style={{
      fontSize: 10,
      fontWeight: 700,
      color: T.muted,
      textTransform: "uppercase",
      letterSpacing: ".08em",
      marginBottom: 10,
    }}
  >
    {children}
  </div>
);

const Toast = ({ msg, visible }) => (
  <div
    style={{
      position: "fixed",
      bottom: 24,
      left: "50%",
      transform: `translateX(-50%) translateY(${visible ? 0 : 20}px)`,
      background: T.dark,
      color: T.white,
      padding: "10px 20px",
      borderRadius: 999,
      fontSize: 13,
      fontWeight: 500,
      boxShadow: shadow.lg,
      opacity: visible ? 1 : 0,
      transition: "all .3s",
      pointerEvents: "none",
      zIndex: 999,
      whiteSpace: "nowrap",
    }}
  >
    {msg}
  </div>
);

// ─── SCREEN: ONBOARDING ────────────────────────────────────────────────────────
const Onboarding = ({ onDone }) => {
  const [step, setStep] = useState(1);
  const [biz, setBiz] = useState({ name: "", category: "", city: "", lang: "Both" });
  const [services, setServices] = useState([{ name: "", duration: "45", price: "" }]);
  const [hours, setHours] = useState(
    ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((d, i) => ({
      day: d,
      open: i < 6,
      from: "09:00",
      to: "18:00",
    })),
  );
  const cats = ["Beauty", "Health", "Fitness", "Tutor", "Home", "Hospitality", "Other"];

  const canNext1 = biz.name && biz.category;
  const canNext2 = services[0].name;

  return (
    <div style={{ maxWidth: 460, margin: "0 auto" }}>
      <Card style={{ overflow: "hidden" }}>
        {/* Header */}
        <div style={{ background: T.primary, padding: "18px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <div
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: T.white,
                opacity: 0.9,
              }}
            />
            <span
              style={{ color: T.white, fontSize: 15, fontWeight: 700, letterSpacing: "-.01em" }}
            >
              Reservly
            </span>
          </div>
          <div style={{ color: "rgba(255,255,255,.75)", fontSize: 12, marginBottom: 8 }}>
            Step {step} of 3 — {["Your business", "Services", "Opening hours"][step - 1]}
          </div>
          <ProgressBar steps={3} current={step} />
        </div>

        <div style={{ padding: 24 }}>
          {/* Step 1 */}
          {step === 1 && (
            <>
              <div style={{ fontSize: 16, fontWeight: 700, color: T.dark, marginBottom: 4 }}>
                Tell us about your business
              </div>
              <div style={{ fontSize: 13, color: T.mid, marginBottom: 20 }}>
                This is what customers see on your booking page.
              </div>
              <Input
                label="Business name"
                placeholder="e.g. Salon Rose"
                value={biz.name}
                onChange={(e) => setBiz({ ...biz, name: e.target.value })}
              />
              <div style={{ marginBottom: 14 }}>
                <SectionLabel>Category</SectionLabel>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {cats.map((c) => (
                    <div
                      key={c}
                      onClick={() => setBiz({ ...biz, category: c })}
                      style={{
                        padding: "7px 14px",
                        borderRadius: 999,
                        fontSize: 13,
                        cursor: "pointer",
                        border: `1.5px solid ${biz.category === c ? T.primary : T.border}`,
                        background: biz.category === c ? T.primaryLight : T.white,
                        color: biz.category === c ? T.primary : T.body,
                        fontWeight: biz.category === c ? 600 : 400,
                        transition: "all .15s",
                      }}
                    >
                      {c}
                    </div>
                  ))}
                </div>
              </div>
              <Input
                label="City"
                placeholder="Port Louis, Quatre Bornes…"
                value={biz.city}
                onChange={(e) => setBiz({ ...biz, city: e.target.value })}
              />
              <div style={{ marginBottom: 20 }}>
                <SectionLabel>Booking page language</SectionLabel>
                <div style={{ display: "flex", gap: 8 }}>
                  {["English", "Français", "Both"].map((l) => (
                    <div
                      key={l}
                      onClick={() => setBiz({ ...biz, lang: l })}
                      style={{
                        flex: 1,
                        padding: "9px 0",
                        textAlign: "center",
                        borderRadius: 9,
                        cursor: "pointer",
                        border: `1.5px solid ${biz.lang === l ? T.primary : T.border}`,
                        background: biz.lang === l ? T.primaryLight : T.white,
                        color: biz.lang === l ? T.primary : T.mid,
                        fontWeight: biz.lang === l ? 600 : 400,
                        fontSize: 13,
                        transition: "all .15s",
                      }}
                    >
                      {l}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <>
              <div style={{ fontSize: 16, fontWeight: 700, color: T.dark, marginBottom: 4 }}>
                Add your services
              </div>
              <div style={{ fontSize: 13, color: T.mid, marginBottom: 20 }}>
                Free plan: 1 service. Pro: up to 5.
              </div>
              {services.map((s, i) => (
                <Card key={i} style={{ padding: 16, marginBottom: 12 }}>
                  <Input
                    label="Service name"
                    placeholder="e.g. Haircut, Physio session…"
                    value={s.name}
                    onChange={(e) => {
                      const n = [...services];
                      n[i] = { ...n[i], name: e.target.value };
                      setServices(n);
                    }}
                  />
                  <div style={{ display: "flex", gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <SectionLabel>Duration</SectionLabel>
                      <select
                        value={s.duration}
                        onChange={(e) => {
                          const n = [...services];
                          n[i] = { ...n[i], duration: e.target.value };
                          setServices(n);
                        }}
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          borderRadius: 10,
                          border: `1.5px solid ${T.border}`,
                          fontSize: 13,
                          color: T.dark,
                          background: T.white,
                          fontFamily: "inherit",
                        }}
                      >
                        {["15", "30", "45", "60", "90", "120"].map((d) => (
                          <option key={d} value={d}>
                            {d} min
                          </option>
                        ))}
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      <Input
                        label="Price (optional)"
                        placeholder="Rs 350"
                        value={s.price}
                        onChange={(e) => {
                          const n = [...services];
                          n[i] = { ...n[i], price: e.target.value };
                          setServices(n);
                        }}
                      />
                    </div>
                  </div>
                </Card>
              ))}
              <Btn
                variant="outline"
                full
                onClick={() => setServices([...services, { name: "", duration: "45", price: "" }])}
              >
                + Add another service
              </Btn>
            </>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <>
              <div style={{ fontSize: 16, fontWeight: 700, color: T.dark, marginBottom: 4 }}>
                Set your opening hours
              </div>
              <div style={{ fontSize: 13, color: T.mid, marginBottom: 20 }}>
                Toggle days on or off and set your hours.
              </div>
              <Card style={{ overflow: "hidden" }}>
                {hours.map((h, i) => (
                  <div
                    key={h.day}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "11px 16px",
                      borderBottom: i < 6 ? `1px solid ${T.borderLight}` : "none",
                    }}
                  >
                    {/* Toggle */}
                    <div
                      onClick={() => {
                        const n = [...hours];
                        n[i] = { ...n[i], open: !n[i].open };
                        setHours(n);
                      }}
                      style={{
                        width: 36,
                        height: 20,
                        borderRadius: 999,
                        background: h.open ? T.primary : T.border,
                        position: "relative",
                        cursor: "pointer",
                        transition: "background .2s",
                        flexShrink: 0,
                      }}
                    >
                      <div
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: "50%",
                          background: T.white,
                          position: "absolute",
                          top: 2,
                          left: h.open ? 18 : 2,
                          transition: "left .2s",
                          boxShadow: "0 1px 3px rgba(0,0,0,.2)",
                        }}
                      />
                    </div>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: h.open ? 500 : 400,
                        color: h.open ? T.dark : T.muted,
                        minWidth: 90,
                      }}
                    >
                      {h.day}
                    </span>
                    {h.open ? (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          marginLeft: "auto",
                        }}
                      >
                        <select
                          value={h.from}
                          onChange={(e) => {
                            const n = [...hours];
                            n[i] = { ...n[i], from: e.target.value };
                            setHours(n);
                          }}
                          style={{
                            padding: "5px 8px",
                            borderRadius: 7,
                            border: `1px solid ${T.border}`,
                            fontSize: 12,
                            color: T.dark,
                            background: T.white,
                            fontFamily: "inherit",
                          }}
                        >
                          {["07:00", "08:00", "09:00", "10:00"].map((t) => (
                            <option key={t}>{t}</option>
                          ))}
                        </select>
                        <span style={{ fontSize: 12, color: T.muted }}>–</span>
                        <select
                          value={h.to}
                          onChange={(e) => {
                            const n = [...hours];
                            n[i] = { ...n[i], to: e.target.value };
                            setHours(n);
                          }}
                          style={{
                            padding: "5px 8px",
                            borderRadius: 7,
                            border: `1px solid ${T.border}`,
                            fontSize: 12,
                            color: T.dark,
                            background: T.white,
                            fontFamily: "inherit",
                          }}
                        >
                          {["17:00", "18:00", "19:00", "20:00"].map((t) => (
                            <option key={t}>{t}</option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <span style={{ fontSize: 12, color: T.muted, marginLeft: "auto" }}>
                        Closed
                      </span>
                    )}
                  </div>
                ))}
              </Card>
            </>
          )}

          {/* Nav */}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24, gap: 10 }}>
            {step > 1 ? (
              <Btn variant="ghost" onClick={() => setStep(step - 1)}>
                ← Back
              </Btn>
            ) : (
              <div />
            )}
            <Btn
              variant="primary"
              disabled={step === 1 ? !canNext1 : step === 2 ? !canNext2 : false}
              onClick={() => (step < 3 ? setStep(step + 1) : onDone?.({ biz, services, hours }))}
            >
              {step === 3 ? "Go to dashboard →" : "Continue →"}
            </Btn>
          </div>
        </div>
      </Card>
    </div>
  );
};

// ─── SCREEN: BOOKING PAGE ──────────────────────────────────────────────────────
const BookingPage = ({
  bizName = "Salon Rose",
  category = "Beauty",
  city = "Port Louis",
  services,
  onConfirm,
}) => {
  const svcs = services ?? [
    { id: 1, name: "Haircut", duration: 45, price: "Rs 350", icon: "✂️" },
    { id: 2, name: "Colour", duration: 90, price: "Rs 800", icon: "🎨" },
    { id: 3, name: "Blowout", duration: 30, price: "Rs 250", icon: "💨" },
    { id: 4, name: "Cut + Blow", duration: 75, price: "Rs 550", icon: "💇" },
  ];

  const today = new Date(2026, 5, 9); // June 9 2026
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i + 1);
    return { day: d.toLocaleDateString("en-GB", { weekday: "short" }), num: d.getDate() };
  });

  const allTimes = [
    "09:00",
    "09:30",
    "10:00",
    "10:30",
    "11:00",
    "11:30",
    "13:00",
    "13:30",
    "14:00",
    "14:30",
    "15:00",
    "15:30",
  ];
  const takenIdx = new Set([0, 1, 5]);

  const [selSvc, setSelSvc] = useState(null);
  const [selDate, setSelDate] = useState(null);
  const [selTime, setSelTime] = useState(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const step = selSvc === null ? 1 : selDate === null ? 2 : selTime === null ? 3 : 4;
  const ready = selSvc !== null && selDate !== null && selTime !== null && name && phone;

  return (
    <div style={{ maxWidth: 400, margin: "0 auto" }}>
      <Card style={{ overflow: "hidden" }}>
        {/* URL bar */}
        <div
          style={{
            background: T.primary,
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ color: "rgba(255,255,255,.65)", fontSize: 11 }}>
            reservly.app/b/salon-rose
          </span>
          <div style={{ display: "flex", gap: 6 }}>
            <Tag color={T.white} bg="rgba(255,255,255,.15)">
              EN
            </Tag>
            <Tag color={T.white} bg="rgba(255,255,255,.15)">
              FR
            </Tag>
          </div>
        </div>

        {/* Progress */}
        <div style={{ padding: "10px 16px 0", display: "flex", gap: 4 }}>
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              style={{
                flex: 1,
                height: 3,
                borderRadius: 999,
                background: s <= step ? T.primary : T.borderLight,
                transition: "background .2s",
              }}
            />
          ))}
        </div>

        {/* Business header */}
        <div
          style={{
            padding: "14px 16px 12px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            borderBottom: `1px solid ${T.borderLight}`,
          }}
        >
          <div
            style={{
              width: 50,
              height: 50,
              borderRadius: 14,
              background: T.primaryLight,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
            }}
          >
            💇
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.dark, letterSpacing: "-.01em" }}>
              {bizName}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
              <Tag>{category}</Tag>
              <span style={{ fontSize: 12, color: T.muted }}>· {city}</span>
            </div>
          </div>
        </div>

        <div style={{ padding: "0 16px 20px", maxHeight: 520, overflowY: "auto" }}>
          {/* Services */}
          <div style={{ paddingTop: 16 }}>
            <SectionLabel>1 — Pick a service</SectionLabel>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {svcs.map((s) => (
                <div
                  key={s.id}
                  onClick={() => setSelSvc(s.id)}
                  style={{
                    border: `1.5px solid ${selSvc === s.id ? T.primary : T.border}`,
                    borderRadius: 12,
                    padding: "12px 10px",
                    cursor: "pointer",
                    background: selSvc === s.id ? T.primaryLight : T.white,
                    transition: "all .15s",
                  }}
                >
                  <div style={{ fontSize: 20, marginBottom: 5 }}>{s.icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.dark }}>{s.name}</div>
                  <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>
                    {s.duration} min · {s.price}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dates */}
          <div style={{ paddingTop: 16 }}>
            <SectionLabel>2 — Pick a date</SectionLabel>
            <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4 }}>
              {dates.map((d, i) => (
                <div
                  key={i}
                  onClick={() => setSelDate(i)}
                  style={{
                    minWidth: 50,
                    textAlign: "center",
                    padding: "9px 6px",
                    borderRadius: 11,
                    border: `1.5px solid ${selDate === i ? T.primary : T.border}`,
                    background: selDate === i ? T.primary : T.white,
                    cursor: "pointer",
                    transition: "all .15s",
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      color: selDate === i ? "rgba(255,255,255,.7)" : T.muted,
                    }}
                  >
                    {d.day}
                  </div>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 600,
                      color: selDate === i ? T.white : T.dark,
                      marginTop: 2,
                    }}
                  >
                    {d.num}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Times */}
          <div style={{ paddingTop: 16 }}>
            <SectionLabel>3 — Pick a time</SectionLabel>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
              {allTimes.map((t, i) => (
                <Pill
                  key={i}
                  active={selTime === i}
                  disabled={takenIdx.has(i)}
                  onClick={() => !takenIdx.has(i) && setSelTime(i)}
                >
                  {t}
                </Pill>
              ))}
            </div>
          </div>

          {/* Details */}
          <div style={{ paddingTop: 16 }}>
            <SectionLabel>4 — Your details</SectionLabel>
            <Input
              label="Your name"
              placeholder="Marie Dupont"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              label="WhatsApp number"
              prefix="+230"
              placeholder="5700 0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              note="Your confirmation will be sent here."
            />
          </div>

          {/* CTA */}
          <div style={{ paddingTop: 6 }}>
            <button
              onClick={() =>
                ready &&
                onConfirm?.({
                  svc: svcs.find((s) => s.id === selSvc),
                  date: dates[selDate],
                  time: allTimes[selTime],
                  name,
                  phone,
                })
              }
              style={{
                width: "100%",
                padding: 14,
                borderRadius: 12,
                border: "none",
                background: ready ? T.primary : T.borderLight,
                color: ready ? T.white : T.muted,
                fontSize: 14,
                fontWeight: 600,
                cursor: ready ? "pointer" : "default",
                transition: "all .2s",
                letterSpacing: "-.01em",
              }}
            >
              {ready ? "Confirm booking →" : "Complete all steps above"}
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
};

// ─── SCREEN: CONFIRMATION ──────────────────────────────────────────────────────
const Confirmation = ({ booking, onNewBooking }) => {
  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    setTimeout(() => setPulse(true), 100);
  }, []);
  return (
    <div style={{ maxWidth: 400, margin: "0 auto" }}>
      <Card style={{ overflow: "hidden" }}>
        <div style={{ background: T.success, padding: "14px 18px" }}>
          <span style={{ color: T.white, fontSize: 14, fontWeight: 700, letterSpacing: "-.01em" }}>
            Reservly
          </span>
        </div>
        <div style={{ padding: "32px 24px", textAlign: "center" }}>
          <div
            style={{
              width: 76,
              height: 76,
              borderRadius: "50%",
              background: pulse ? T.successLight : "transparent",
              border: `2px solid ${pulse ? T.success : T.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 18px",
              fontSize: 36,
              transition: "all .4s",
              transform: pulse ? "scale(1)" : "scale(.7)",
            }}
          >
            ✓
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: T.dark,
              marginBottom: 6,
              letterSpacing: "-.02em",
            }}
          >
            Booking confirmed!
          </div>
          <div style={{ fontSize: 13, color: T.mid, marginBottom: 24 }}>
            See you soon at {booking?.biz ?? "Salon Rose"}
          </div>

          <Card style={{ padding: "16px 18px", textAlign: "left", marginBottom: 18 }}>
            {[
              ["Business", booking?.biz ?? "Salon Rose"],
              [
                "Service",
                `${booking?.svc?.name ?? "Haircut"} · ${booking?.svc?.duration ?? 45} min`,
              ],
              [
                "Date",
                booking?.date ? `${booking.date.day} ${booking.date.num} June` : "Wed 10 June",
              ],
              ["Time", booking?.time ?? "10:30 AM"],
              ["Price", booking?.svc?.price ?? "Rs 350"],
            ].map(([l, v], i, arr) => (
              <div
                key={l}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 0",
                  borderBottom: i < arr.length - 1 ? `1px solid ${T.borderLight}` : "none",
                }}
              >
                <span style={{ fontSize: 13, color: T.muted }}>{l}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: T.dark }}>{v}</span>
              </div>
            ))}
          </Card>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              fontSize: 13,
              color: T.success,
              marginBottom: 20,
              background: T.successLight,
              padding: "10px 16px",
              borderRadius: 10,
            }}
          >
            <span>💬</span>
            <span>
              Confirmation sent to {booking?.phone ? `+230 ${booking.phone}` : "your WhatsApp"}
            </span>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <Btn variant="ghost" full>
              Add to calendar
            </Btn>
            <Btn variant="outline" full onClick={onNewBooking}>
              New booking
            </Btn>
          </div>
        </div>
      </Card>
    </div>
  );
};

// ─── SCREEN: DASHBOARD ─────────────────────────────────────────────────────────
const Dashboard = ({ bizName = "Salon Rose" }) => {
  const [tab, setTab] = useState("home");
  const [toast, setToast] = useState(false);

  const bookings = [
    { time: "09:00", name: "Marie D.", service: "Haircut", status: "confirmed", price: "Rs 350" },
    { time: "10:30", name: "Jean-Paul", service: "Colour", status: "confirmed", price: "Rs 800" },
    { time: "13:00", name: "Sophie R.", service: "Cut + Blow", status: "pending", price: "Rs 550" },
    { time: "15:00", name: null, service: null, status: "open", price: null },
    { time: "16:30", name: null, service: null, status: "open", price: null },
  ];

  const upcomingFull = [
    {
      date: "Wed 10 Jun",
      time: "09:00",
      name: "Marie D.",
      service: "Haircut",
      status: "confirmed",
    },
    {
      date: "Wed 10 Jun",
      time: "10:30",
      name: "Jean-Paul",
      service: "Colour",
      status: "confirmed",
    },
    {
      date: "Wed 10 Jun",
      time: "13:00",
      name: "Sophie R.",
      service: "Cut + Blow",
      status: "pending",
    },
    {
      date: "Thu 11 Jun",
      time: "09:30",
      name: "Priya N.",
      service: "Blowout",
      status: "confirmed",
    },
    {
      date: "Thu 11 Jun",
      time: "14:00",
      name: "Claire M.",
      service: "Haircut",
      status: "confirmed",
    },
    { date: "Fri 12 Jun", time: "10:00", name: "Anisha R.", service: "Colour", status: "pending" },
  ];

  const statusStyle = {
    confirmed: { bg: T.successLight, color: T.success, label: "Confirmed" },
    pending: { bg: T.warningLight, color: T.warning, label: "Pending" },
    open: { bg: T.surface, color: T.muted, label: "Available" },
  };

  const copyLink = () => {
    setToast(true);
    setTimeout(() => setToast(false), 2200);
  };

  const navItems = [
    { id: "home", icon: "🏠", label: "Home" },
    { id: "bookings", icon: "📋", label: "Bookings" },
    { id: "settings", icon: "⚙️", label: "Settings" },
  ];

  return (
    <div style={{ maxWidth: 680, margin: "0 auto" }}>
      <Card style={{ overflow: "hidden" }}>
        {/* Top nav */}
        <div
          style={{
            background: T.dark,
            padding: "13px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.primary }} />
            <span
              style={{ color: T.white, fontSize: 15, fontWeight: 700, letterSpacing: "-.01em" }}
            >
              Reservly
            </span>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {navItems.map((n) => (
              <button
                key={n.id}
                onClick={() => setTab(n.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "6px 12px",
                  borderRadius: 8,
                  border: "none",
                  background: tab === n.id ? "rgba(255,255,255,.12)" : "transparent",
                  color: tab === n.id ? T.white : "rgba(255,255,255,.5)",
                  fontSize: 12,
                  fontWeight: tab === n.id ? 500 : 400,
                  cursor: "pointer",
                  transition: "all .15s",
                }}
              >
                <span>{n.icon}</span>
                <span>{n.label}</span>
              </button>
            ))}
          </div>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: T.primary,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              color: T.white,
              fontWeight: 700,
            }}
          >
            M
          </div>
        </div>

        <div style={{ padding: 20 }}>
          {/* HOME TAB */}
          {tab === "home" && (
            <>
              {/* Greeting + link banner */}
              <div style={{ marginBottom: 18 }}>
                <div
                  style={{ fontSize: 19, fontWeight: 700, color: T.dark, letterSpacing: "-.02em" }}
                >
                  Good morning, Marie 👋
                </div>
                <div style={{ fontSize: 13, color: T.mid, marginTop: 2 }}>
                  Wednesday 10 June · {bizName}
                </div>
              </div>

              {/* Booking link banner */}
              <div
                style={{
                  background: T.primaryLight,
                  border: `1px solid ${T.primaryMid}`,
                  borderRadius: 12,
                  padding: "12px 16px",
                  marginBottom: 20,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: T.primary,
                      textTransform: "uppercase",
                      letterSpacing: ".06em",
                      marginBottom: 3,
                    }}
                  >
                    Your booking link
                  </div>
                  <div style={{ fontSize: 13, color: T.dark, fontWeight: 500 }}>
                    reservly.app/b/salon-rose
                  </div>
                </div>
                <Btn variant="primary" size="sm" onClick={copyLink}>
                  Copy link
                </Btn>
              </div>

              {/* Stats */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4,1fr)",
                  gap: 10,
                  marginBottom: 20,
                }}
              >
                {[
                  { val: "4", label: "Today", color: T.primary, bg: T.primaryLight },
                  { val: "19", label: "This week", color: T.dark, bg: T.surface },
                  { val: "Rs 6,800", label: "Week revenue", color: T.success, bg: T.successLight },
                  { val: "1", label: "No-shows", color: T.warning, bg: T.warningLight },
                ].map((s) => (
                  <div
                    key={s.label}
                    style={{
                      background: s.bg,
                      borderRadius: 12,
                      padding: "14px 12px",
                      textAlign: "center",
                      border: `1px solid ${T.border}`,
                    }}
                  >
                    <div
                      style={{
                        fontSize: s.val.length > 4 ? 15 : 22,
                        fontWeight: 700,
                        color: s.color,
                        lineHeight: 1,
                      }}
                    >
                      {s.val}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: T.mid,
                        marginTop: 5,
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: ".04em",
                      }}
                    >
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* Today */}
              <SectionLabel>Today — Wednesday 10 June</SectionLabel>
              <Card style={{ overflow: "hidden", marginBottom: 14 }}>
                {bookings.map((b, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 16px",
                      borderBottom: i < bookings.length - 1 ? `1px solid ${T.borderLight}` : "none",
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 500, color: T.muted, minWidth: 46 }}>
                      {b.time}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: b.name ? 600 : 400,
                          color: b.name ? T.dark : T.muted,
                        }}
                      >
                        {b.name ?? "— slot available —"}
                      </div>
                      {b.service && (
                        <div style={{ fontSize: 12, color: T.muted, marginTop: 1 }}>
                          {b.service}
                        </div>
                      )}
                    </div>
                    {b.price && (
                      <span style={{ fontSize: 12, fontWeight: 500, color: T.body }}>
                        {b.price}
                      </span>
                    )}
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: "3px 10px",
                        borderRadius: 999,
                        background: statusStyle[b.status].bg,
                        color: statusStyle[b.status].color,
                      }}
                    >
                      {statusStyle[b.status].label}
                    </span>
                  </div>
                ))}
              </Card>
              <Btn variant="outline">+ Add manual booking</Btn>
            </>
          )}

          {/* BOOKINGS TAB */}
          {tab === "bookings" && (
            <>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: T.dark, marginBottom: 2 }}>
                  All upcoming bookings
                </div>
                <div style={{ fontSize: 13, color: T.mid }}>Next 7 days</div>
              </div>
              <Card style={{ overflow: "hidden" }}>
                {upcomingFull.map((b, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 16px",
                      borderBottom:
                        i < upcomingFull.length - 1 ? `1px solid ${T.borderLight}` : "none",
                    }}
                  >
                    <div style={{ minWidth: 80 }}>
                      <div style={{ fontSize: 11, color: T.muted }}>{b.date}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: T.dark }}>{b.time}</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: T.dark }}>{b.name}</div>
                      <div style={{ fontSize: 12, color: T.muted }}>{b.service}</div>
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: "3px 10px",
                        borderRadius: 999,
                        background: statusStyle[b.status].bg,
                        color: statusStyle[b.status].color,
                      }}
                    >
                      {statusStyle[b.status].label}
                    </span>
                    <Btn variant="ghost" size="sm">
                      Cancel
                    </Btn>
                  </div>
                ))}
              </Card>
            </>
          )}

          {/* SETTINGS TAB */}
          {tab === "settings" && (
            <>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: T.dark, marginBottom: 2 }}>
                  Settings
                </div>
                <div style={{ fontSize: 13, color: T.mid }}>
                  Manage your business profile and plan
                </div>
              </div>

              {/* Plan badge */}
              <div
                style={{
                  background: T.primaryLight,
                  border: `1px solid ${T.primaryMid}`,
                  borderRadius: 12,
                  padding: "14px 16px",
                  marginBottom: 20,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: T.primary,
                      textTransform: "uppercase",
                      letterSpacing: ".06em",
                      marginBottom: 3,
                    }}
                  >
                    Current plan
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: T.dark }}>
                    Free{" "}
                    <span style={{ color: T.muted, fontWeight: 400, fontSize: 13 }}>
                      · 18 / 30 bookings used this month
                    </span>
                  </div>
                </div>
                <Btn variant="primary" size="sm">
                  Upgrade to Pro — $5/mo
                </Btn>
              </div>

              <Card style={{ overflow: "hidden", marginBottom: 14 }}>
                {[
                  { label: "Business name", val: "Salon Rose" },
                  { label: "Category", val: "Beauty" },
                  { label: "City", val: "Port Louis" },
                  { label: "WhatsApp number", val: "+230 5700 1234" },
                  { label: "Booking link", val: "reservly.app/b/salon-rose" },
                  { label: "Language", val: "EN + FR" },
                ].map((r, i, arr) => (
                  <div
                    key={r.label}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px 16px",
                      borderBottom: i < arr.length - 1 ? `1px solid ${T.borderLight}` : "none",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 11,
                          color: T.muted,
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: ".04em",
                          marginBottom: 2,
                        }}
                      >
                        {r.label}
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: T.dark }}>{r.val}</div>
                    </div>
                    <Btn variant="ghost" size="sm">
                      Edit
                    </Btn>
                  </div>
                ))}
              </Card>

              <Btn variant="danger">Sign out</Btn>
            </>
          )}
        </div>
      </Card>
      <Toast msg="✓ Link copied to clipboard" visible={toast} />
    </div>
  );
};

// ─── MAIN APP ──────────────────────────────────────────────────────────────────
export default function App() {
  // flow: onboarding → booking → confirmation → dashboard
  const [screen, setScreen] = useState("onboarding");
  const [booking, setBooking] = useState(null);
  const [bizData, setBizData] = useState(null);

  const screens = [
    { id: "onboarding", label: "① Onboarding" },
    { id: "booking", label: "② Booking page" },
    { id: "confirmation", label: "③ Confirmation" },
    { id: "dashboard", label: "④ Dashboard" },
  ];

  return (
    <div
      style={{
        fontFamily: "'Inter',-apple-system,sans-serif",
        background: T.surface,
        minHeight: "100vh",
        padding: "20px 16px 60px",
      }}
    >
      {/* Nav */}
      <div
        style={{ maxWidth: 700, margin: "0 auto 24px", display: "flex", gap: 6, flexWrap: "wrap" }}
      >
        {screens.map((s) => (
          <button
            key={s.id}
            onClick={() => setScreen(s.id)}
            style={{
              padding: "7px 14px",
              borderRadius: 999,
              border: "none",
              background: screen === s.id ? T.primary : T.white,
              color: screen === s.id ? T.white : T.mid,
              fontSize: 13,
              fontWeight: screen === s.id ? 600 : 400,
              cursor: "pointer",
              boxShadow: shadow.sm,
              border: screen === s.id ? "none" : `1px solid ${T.border}`,
              transition: "all .15s",
            }}
          >
            {s.label}
          </button>
        ))}
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            color: T.muted,
          }}
        >
          <span>Flow:</span>
          <span style={{ color: T.primary, fontWeight: 500 }}>
            Onboarding → Book → Confirm → Manage
          </span>
        </div>
      </div>

      {/* Screens */}
      {screen === "onboarding" && (
        <Onboarding
          onDone={(data) => {
            setBizData(data);
            setScreen("booking");
          }}
        />
      )}
      {screen === "booking" && (
        <BookingPage
          bizName={bizData?.biz?.name || "Salon Rose"}
          services={bizData?.services
            ?.filter((s) => s.name)
            .map((s, i) => ({
              id: i + 1,
              name: s.name,
              duration: parseInt(s.duration),
              price: s.price || "Rs 350",
              icon: ["✂️", "🎨", "💨", "💇", "🌿"][i] || "⭐",
            }))}
          onConfirm={(b) => {
            setBooking(b);
            setScreen("confirmation");
          }}
        />
      )}
      {screen === "confirmation" && (
        <Confirmation
          booking={{ ...booking, biz: bizData?.biz?.name || "Salon Rose" }}
          onNewBooking={() => setScreen("booking")}
        />
      )}
      {screen === "dashboard" && <Dashboard bizName={bizData?.biz?.name || "Salon Rose"} />}
    </div>
  );
}
