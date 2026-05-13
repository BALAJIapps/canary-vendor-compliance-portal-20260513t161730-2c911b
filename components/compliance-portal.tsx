"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Building2,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Bell,
  LayoutDashboard,
  Upload,
  UserCheck,
  RefreshCw,
  ChevronRight,
  Shield,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

type Vendor = {
  id: string;
  companyName: string;
  contactName: string;
  contactEmail: string;
  category: string;
  status: string;
  reviewerNote: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type VendorDocument = {
  id: string;
  vendorId: string;
  documentName: string;
  documentType: string;
  fileUrl: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  uploadedAt: string;
};

type Notification = {
  id: string;
  vendorId: string | null;
  type: string;
  message: string;
  status: string;
  createdAt: string;
};

type Metrics = {
  totalVendors: number;
  pendingVendors: number;
  approvedVendors: number;
  rejectedVendors: number;
  totalDocuments: number;
  totalNotifications: number;
};

function StatusBadge({ status }: { status: string }) {
  if (status === "approved")
    return <Badge className="bg-[#16A34A] text-white hover:bg-[#15803d] text-[11px] font-medium">Approved</Badge>;
  if (status === "rejected")
    return <Badge className="bg-[#DC2626] text-white hover:bg-[#b91c1c] text-[11px] font-medium">Rejected</Badge>;
  if (status === "sent")
    return <Badge variant="outline" className="border-[#16A34A] text-[#16A34A] text-[11px] font-medium">Sent</Badge>;
  if (status === "failed")
    return <Badge variant="destructive" className="text-[11px] font-medium">Failed</Badge>;
  return <Badge variant="outline" className="text-[#D97706] border-[#D97706] text-[11px] font-medium">Pending review</Badge>;
}

function NotifTypeLabel({ type }: { type: string }) {
  const map: Record<string, string> = {
    vendor_registered: "Registration",
    document_uploaded: "Document Upload",
    vendor_approved: "Approval",
    vendor_rejected: "Rejection",
    compliance_check: "Compliance Check",
  };
  return <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{map[type] ?? type}</span>;
}

/* Compliance health bar — distinctive element */
function ComplianceHealthBar({ metrics }: { metrics: Metrics | null }) {
  if (!metrics || metrics.totalVendors === 0) return null;
  const approvalRate = Math.round((metrics.approvedVendors / metrics.totalVendors) * 100);
  const pendingRate = Math.round((metrics.pendingVendors / metrics.totalVendors) * 100);
  const rejectedRate = 100 - approvalRate - pendingRate;

  let healthLabel = "At Risk";
  let healthColor = "text-[#DC2626]";
  if (approvalRate >= 80) { healthLabel = "Healthy"; healthColor = "text-[#16A34A]"; }
  else if (approvalRate >= 50) { healthLabel = "Moderate"; healthColor = "text-[#D97706]"; }

  return (
    <div className="bg-[#072C2C] text-white rounded-sm px-6 py-5 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-[#FF5F03]" />
          <span className="text-sm font-medium tracking-wide uppercase" style={{fontFamily: "var(--font-oswald, Georgia, serif)"}}>
            Portfolio Compliance Health
          </span>
        </div>
        <span className={`text-sm font-bold ${healthColor}`}>{healthLabel} — {approvalRate}% approved</span>
      </div>
      <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
        <div className="bg-[#16A34A] transition-all duration-500" style={{width: `${approvalRate}%`}} />
        <div className="bg-[#D97706] transition-all duration-500" style={{width: `${pendingRate}%`}} />
        {rejectedRate > 0 && <div className="bg-[#DC2626] transition-all duration-500" style={{width: `${rejectedRate}%`}} />}
      </div>
      <div className="flex gap-4 mt-2 text-xs text-white/60">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#16A34A] inline-block" />Approved {metrics.approvedVendors}</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#D97706] inline-block" />Pending {metrics.pendingVendors}</span>
        {metrics.rejectedVendors > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#DC2626] inline-block" />Rejected {metrics.rejectedVendors}</span>}
      </div>
    </div>
  );
}

export default function CompliancePortal() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [documents, setDocuments] = useState<VendorDocument[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  const [vForm, setVForm] = useState({ companyName: "", contactName: "", contactEmail: "", category: "" });
  const [vSubmitting, setVSubmitting] = useState(false);
  const [vMsg, setVMsg] = useState("");

  const [dForm, setDForm] = useState({ vendorId: "", documentName: "", documentType: "" });
  const [dSubmitting, setDSubmitting] = useState(false);
  const [dMsg, setDMsg] = useState("");

  const [approving, setApproving] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [approvalMsg, setApprovalMsg] = useState("");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [vRes, dRes, nRes, mRes] = await Promise.all([
        fetch("/api/canary-vendors"),
        fetch("/api/canary-vendor-documents"),
        fetch("/api/canary-notifications"),
        fetch("/api/canary-dashboard"),
      ]);
      const [vData, dData, nData, mData] = await Promise.all([
        vRes.json(), dRes.json(), nRes.json(), mRes.json(),
      ]);
      if (vData.ok) setVendors(vData.vendors);
      if (dData.ok) setDocuments(dData.documents);
      if (nData.ok) setNotifications(nData.notifications);
      if (mData.ok) setMetrics(mData.metrics);
    } catch {
      // show stale state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function submitVendor(e: React.FormEvent) {
    e.preventDefault();
    setVSubmitting(true);
    setVMsg("");
    try {
      const res = await fetch("/api/canary-vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vForm),
      });
      const data = await res.json();
      if (data.ok) {
        setVMsg("Vendor registered successfully.");
        setVForm({ companyName: "", contactName: "", contactEmail: "", category: "" });
        fetchAll();
      } else {
        setVMsg(data.error?.message ?? "Registration failed.");
      }
    } catch {
      setVMsg("Network error. Please try again.");
    } finally {
      setVSubmitting(false);
    }
  }

  async function submitDocument(e: React.FormEvent) {
    e.preventDefault();
    setDSubmitting(true);
    setDMsg("");
    try {
      const res = await fetch("/api/canary-vendor-documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dForm),
      });
      const data = await res.json();
      if (data.ok) {
        setDMsg("Document recorded successfully.");
        setDForm({ vendorId: "", documentName: "", documentType: "" });
        fetchAll();
      } else {
        setDMsg(data.error?.message ?? "Document upload failed.");
      }
    } catch {
      setDMsg("Network error. Please try again.");
    } finally {
      setDSubmitting(false);
    }
  }

  async function handleApproval(vendorId: string, action: "approved" | "rejected") {
    setApproving(vendorId + action);
    setApprovalMsg("");
    try {
      const res = await fetch(`/api/canary-vendors/${vendorId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          reviewerNote: reviewNotes[vendorId] || "",
          reviewedBy: "admin",
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setApprovalMsg(`Vendor ${action} successfully.`);
        fetchAll();
      } else {
        setApprovalMsg(data.error?.message ?? "Action failed.");
      }
    } catch {
      setApprovalMsg("Network error.");
    } finally {
      setApproving(null);
    }
  }

  function docCount(vendorId: string) {
    return documents.filter((d) => d.vendorId === vendorId).length;
  }

  const pendingCount = vendors.filter(v => v.status === "pending").length;

  return (
    <div className="min-h-screen" style={{backgroundColor: "#EDEADE"}}>
      {/* Header */}
      <header className="border-b" style={{backgroundColor: "#072C2C"}}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6" style={{color: "#FF5F03"}} />
            <div>
              <span
                className="text-xl font-display text-white tracking-wide"
                style={{fontFamily: "var(--font-oswald, Georgia, serif)", letterSpacing: "0.04em"}}
              >
                VENDORSHIELD
              </span>
              <span className="ml-3 text-xs text-white/50 font-normal">Compliance Portal</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {pendingCount > 0 && (
              <span className="flex items-center gap-1.5 text-xs text-[#D97706] bg-[#D97706]/10 border border-[#D97706]/30 px-2.5 py-1 rounded-full">
                <AlertTriangle className="h-3 w-3" />
                {pendingCount} awaiting review
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchAll}
              className="text-white/70 hover:text-white hover:bg-white/10 border border-white/20"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8 space-y-6">

        {/* Compliance Health Bar — distinctive element */}
        <ComplianceHealthBar metrics={metrics} />

        {/* Dashboard Metrics */}
        <section aria-label="Dashboard metrics">
          <div className="flex items-center gap-2 mb-3">
            <LayoutDashboard className="h-4 w-4" style={{color: "#072C2C"}} />
            <h2
              className="text-base font-semibold uppercase tracking-widest"
              style={{color: "#072C2C", fontFamily: "var(--font-oswald, Georgia, serif)", letterSpacing: "0.08em"}}
            >
              Live Metrics
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: "Total", value: metrics?.totalVendors ?? "—", icon: Building2, style: {color: "#111827"} },
              { label: "Pending", value: metrics?.pendingVendors ?? "—", icon: Clock, style: {color: "#D97706"} },
              { label: "Approved", value: metrics?.approvedVendors ?? "—", icon: CheckCircle2, style: {color: "#16A34A"} },
              { label: "Rejected", value: metrics?.rejectedVendors ?? "—", icon: XCircle, style: {color: "#DC2626"} },
              { label: "Documents", value: metrics?.totalDocuments ?? "—", icon: FileText, style: {color: "#111827"} },
              { label: "Alerts", value: metrics?.totalNotifications ?? "—", icon: Bell, style: {color: "#FF5F03"} },
            ].map(({ label, value, icon: Icon, style: iconStyle }) => (
              <Card key={label} className="bg-white border-border shadow-none">
                <CardContent className="pt-3 pb-3 px-4">
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest mb-1">{label}</p>
                  <div className="flex items-end justify-between">
                    <p className="text-2xl font-bold" style={iconStyle}>{loading ? "…" : value}</p>
                    <Icon className="h-4 w-4 mb-0.5 opacity-40" style={iconStyle} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Tabs */}
        <Tabs defaultValue="onboard">
          <TabsList className="bg-white border border-border h-auto p-1 gap-1">
            <TabsTrigger value="onboard" className="data-[state=active]:bg-[#072C2C] data-[state=active]:text-white text-sm">
              <Building2 className="h-3.5 w-3.5 mr-1.5" />
              Vendor Onboarding
            </TabsTrigger>
            <TabsTrigger value="documents" className="data-[state=active]:bg-[#072C2C] data-[state=active]:text-white text-sm">
              <Upload className="h-3.5 w-3.5 mr-1.5" />
              Documents
            </TabsTrigger>
            <TabsTrigger value="approvals" className="data-[state=active]:bg-[#072C2C] data-[state=active]:text-white text-sm">
              <UserCheck className="h-3.5 w-3.5 mr-1.5" />
              Admin Approvals
              {pendingCount > 0 && (
                <span className="ml-1.5 bg-[#D97706] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{pendingCount}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="notifications" className="data-[state=active]:bg-[#072C2C] data-[state=active]:text-white text-sm">
              <Bell className="h-3.5 w-3.5 mr-1.5" />
              Notifications
            </TabsTrigger>
          </TabsList>

          {/* Onboarding tab */}
          <TabsContent value="onboard" className="mt-5">
            <div className="grid md:grid-cols-[2fr_3fr] gap-5">
              <Card className="bg-white border-border shadow-none">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold" style={{color: "#072C2C"}}>Register New Vendor</CardTitle>
                  <p className="text-xs text-muted-foreground">Submit vendor details to begin the compliance review process.</p>
                </CardHeader>
                <CardContent>
                  <form onSubmit={submitVendor} className="space-y-3">
                    <div className="space-y-1">
                      <Label htmlFor="companyName" className="text-xs">Company Name</Label>
                      <Input id="companyName" placeholder="Acme Supplies Ltd." value={vForm.companyName} onChange={(e) => setVForm({ ...vForm, companyName: e.target.value })} required className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="contactName" className="text-xs">Contact Name</Label>
                      <Input id="contactName" placeholder="Jane Smith" value={vForm.contactName} onChange={(e) => setVForm({ ...vForm, contactName: e.target.value })} required className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="contactEmail" className="text-xs">Contact Email</Label>
                      <Input id="contactEmail" type="email" placeholder="jane@acme.com" value={vForm.contactEmail} onChange={(e) => setVForm({ ...vForm, contactEmail: e.target.value })} required className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="category" className="text-xs">Vendor Category</Label>
                      <Input id="category" placeholder="Software, Logistics, Facilities…" value={vForm.category} onChange={(e) => setVForm({ ...vForm, category: e.target.value })} required className="h-8 text-sm" />
                    </div>
                    {vMsg && (
                      <p className={`text-xs font-medium ${vMsg.includes("success") ? "text-[#16A34A]" : "text-[#DC2626]"}`}>{vMsg}</p>
                    )}
                    <Button type="submit" disabled={vSubmitting} className="w-full h-8 text-sm" style={{backgroundColor: "#072C2C", color: "white"}}>
                      {vSubmitting ? "Registering…" : "Register Vendor"}
                      <ChevronRight className="ml-1 h-3.5 w-3.5" />
                    </Button>
                  </form>
                </CardContent>
              </Card>
              <Card className="bg-white border-border shadow-none">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold" style={{color: "#072C2C"}}>
                    Registered Vendors
                    <span className="ml-2 text-xs font-normal text-muted-foreground">({vendors.length} total)</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {vendors.length === 0 ? (
                    <div className="py-10 text-center">
                      <Building2 className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-40" />
                      <p className="text-sm text-muted-foreground">No vendors registered yet.</p>
                      <p className="text-xs text-muted-foreground mt-1">Use the form to onboard your first vendor.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {vendors.map((v) => (
                        <div key={v.id} className="py-2.5 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate" style={{color: "#111827"}}>{v.companyName}</p>
                            <p className="text-xs text-muted-foreground">{v.contactEmail} · <span className="italic">{v.category}</span></p>
                          </div>
                          <StatusBadge status={v.status} />
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Documents tab */}
          <TabsContent value="documents" className="mt-5">
            <div className="grid md:grid-cols-[2fr_3fr] gap-5">
              <Card className="bg-white border-border shadow-none">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold" style={{color: "#072C2C"}}>Record Compliance Document</CardTitle>
                  <p className="text-xs text-muted-foreground">Log a document submission against a registered vendor.</p>
                </CardHeader>
                <CardContent>
                  <form onSubmit={submitDocument} className="space-y-3">
                    <div className="space-y-1">
                      <Label htmlFor="docVendorId" className="text-xs">Vendor</Label>
                      <select id="docVendorId" value={dForm.vendorId} onChange={(e) => setDForm({ ...dForm, vendorId: e.target.value })} required className="w-full h-8 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                        <option value="">Select vendor…</option>
                        {vendors.map((v) => (<option key={v.id} value={v.id}>{v.companyName}</option>))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="documentName" className="text-xs">Document Name</Label>
                      <Input id="documentName" placeholder="Insurance Certificate 2025" value={dForm.documentName} onChange={(e) => setDForm({ ...dForm, documentName: e.target.value })} required className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="documentType" className="text-xs">Document Type</Label>
                      <Input id="documentType" placeholder="Insurance, Tax, License, NDA…" value={dForm.documentType} onChange={(e) => setDForm({ ...dForm, documentType: e.target.value })} required className="h-8 text-sm" />
                    </div>
                    {dMsg && (
                      <p className={`text-xs font-medium ${dMsg.includes("success") ? "text-[#16A34A]" : "text-[#DC2626]"}`}>{dMsg}</p>
                    )}
                    <Button type="submit" disabled={dSubmitting} className="w-full h-8 text-sm" style={{backgroundColor: "#072C2C", color: "white"}}>
                      {dSubmitting ? "Recording…" : "Record Document"}
                      <Upload className="ml-1 h-3.5 w-3.5" />
                    </Button>
                  </form>
                </CardContent>
              </Card>
              <Card className="bg-white border-border shadow-none">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold" style={{color: "#072C2C"}}>
                    Document Records
                    <span className="ml-2 text-xs font-normal text-muted-foreground">({documents.length})</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {documents.length === 0 ? (
                    <div className="py-10 text-center">
                      <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-40" />
                      <p className="text-sm text-muted-foreground">No documents recorded yet.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {documents.map((d) => {
                        const vendor = vendors.find((v) => v.id === d.vendorId);
                        return (
                          <div key={d.id} className="py-2.5 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate" style={{color: "#111827"}}>{d.documentName}</p>
                              <p className="text-xs text-muted-foreground">{vendor?.companyName ?? "Unknown"} · {new Date(d.uploadedAt).toLocaleDateString()}</p>
                            </div>
                            <Badge variant="outline" className="text-[11px] shrink-0">{d.documentType}</Badge>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Admin Approvals tab */}
          <TabsContent value="approvals" className="mt-5">
            {approvalMsg && (
              <p className={`mb-3 text-xs font-medium px-3 py-2 rounded ${approvalMsg.includes("success") ? "bg-[#16A34A]/10 text-[#16A34A]" : "bg-[#DC2626]/10 text-[#DC2626]"}`}>{approvalMsg}</p>
            )}
            <Card className="bg-white border-border shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold" style={{color: "#072C2C"}}>
                  Admin Approval Queue
                  <span className="ml-2 text-xs font-normal text-muted-foreground">Review vendor applications and set status</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {vendors.length === 0 ? (
                  <div className="py-10 text-center">
                    <UserCheck className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-40" />
                    <p className="text-sm text-muted-foreground">No vendors to review yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-left">
                          <th className="pb-2 pr-4 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Vendor</th>
                          <th className="pb-2 pr-4 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Category</th>
                          <th className="pb-2 pr-4 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
                          <th className="pb-2 pr-4 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Docs</th>
                          <th className="pb-2 pr-4 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Reviewer Note</th>
                          <th className="pb-2 pr-4 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Reviewed At</th>
                          <th className="pb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {vendors.map((v) => (
                          <tr key={v.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                            <td className="py-3 pr-4">
                              <p className="font-medium" style={{color: "#111827"}}>{v.companyName}</p>
                              <p className="text-xs text-muted-foreground">{v.contactEmail}</p>
                            </td>
                            <td className="py-3 pr-4 text-xs text-muted-foreground">{v.category}</td>
                            <td className="py-3 pr-4"><StatusBadge status={v.status} /></td>
                            <td className="py-3 pr-4 text-center">
                              <span className="font-bold text-sm" style={{color: "#111827"}}>{docCount(v.id)}</span>
                            </td>
                            <td className="py-3 pr-4 max-w-[180px]">
                              {v.status !== "pending" ? (
                                <span className="text-xs text-muted-foreground italic">{v.reviewerNote || "—"}</span>
                              ) : (
                                <Textarea
                                  placeholder="Add review note…"
                                  className="text-xs min-h-[56px] resize-none"
                                  value={reviewNotes[v.id] || ""}
                                  onChange={(e) => setReviewNotes((prev) => ({ ...prev, [v.id]: e.target.value }))}
                                />
                              )}
                            </td>
                            <td className="py-3 pr-4 text-xs text-muted-foreground">
                              {v.reviewedAt ? new Date(v.reviewedAt).toLocaleDateString() : "—"}
                            </td>
                            <td className="py-3">
                              {v.status === "pending" ? (
                                <div className="flex gap-1.5">
                                  <Button size="sm" disabled={approving === v.id + "approved"} onClick={() => handleApproval(v.id, "approved")} className="h-7 text-xs bg-[#16A34A] text-white hover:bg-[#15803d]">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    {approving === v.id + "approved" ? "…" : "Approve"}
                                  </Button>
                                  <Button size="sm" variant="destructive" disabled={approving === v.id + "rejected"} onClick={() => handleApproval(v.id, "rejected")} className="h-7 text-xs">
                                    <XCircle className="h-3 w-3 mr-1" />
                                    {approving === v.id + "rejected" ? "…" : "Reject"}
                                  </Button>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">By {v.reviewedBy ?? "admin"}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications tab */}
          <TabsContent value="notifications" className="mt-5">
            <Card className="bg-white border-border shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold" style={{color: "#072C2C"}}>
                  Notification Audit Trail
                  <span className="ml-2 text-xs font-normal text-muted-foreground">({notifications.length} events recorded)</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {notifications.length === 0 ? (
                  <div className="py-10 text-center">
                    <Bell className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-40" />
                    <p className="text-sm text-muted-foreground">No notifications yet.</p>
                    <p className="text-xs text-muted-foreground mt-1">Events are recorded automatically when vendors are registered or approved.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {notifications.map((n) => (
                      <div key={n.id} className="py-3 flex items-start gap-3">
                        <div className="shrink-0 mt-0.5">
                          {n.type === "vendor_approved" && <CheckCircle2 className="h-4 w-4 text-[#16A34A]" />}
                          {n.type === "vendor_rejected" && <XCircle className="h-4 w-4 text-[#DC2626]" />}
                          {n.type === "vendor_registered" && <Building2 className="h-4 w-4 text-[#D97706]" />}
                          {n.type === "document_uploaded" && <FileText className="h-4 w-4 text-muted-foreground" />}
                          {!['vendor_approved','vendor_rejected','vendor_registered','document_uploaded'].includes(n.type) && <Bell className="h-4 w-4 text-muted-foreground" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <NotifTypeLabel type={n.type} />
                            <StatusBadge status={n.status} />
                          </div>
                          <p className="text-sm" style={{color: "#111827"}}>{n.message}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{new Date(n.createdAt).toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <footer className="border-t mt-12" style={{backgroundColor: "#072C2C"}}>
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <span className="text-xs text-white/50">VendorShield Compliance Portal</span>
          <span className="text-xs text-white/40">Onboarding · Documents · Approvals · Audit Trail</span>
        </div>
      </footer>
    </div>
  );
}
