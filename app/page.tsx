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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

/* ── Types ── */
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

/* ── Status badge helper ── */
function StatusBadge({ status }: { status: string }) {
  if (status === "approved")
    return <Badge className="bg-[#16A34A] text-white hover:bg-[#15803d]">Approved</Badge>;
  if (status === "rejected")
    return <Badge className="bg-[#DC2626] text-white hover:bg-[#b91c1c]">Rejected</Badge>;
  if (status === "sent")
    return <Badge className="bg-[#16A34A] text-white hover:bg-[#15803d]">Sent</Badge>;
  if (status === "failed")
    return <Badge variant="destructive">Failed</Badge>;
  return <Badge variant="outline" className="text-[#D97706] border-[#D97706]">Pending</Badge>;
}

/* ── Notification type label ── */
function NotifTypeLabel({ type }: { type: string }) {
  const map: Record<string, string> = {
    vendor_registered: "Registration",
    document_uploaded: "Document Upload",
    vendor_approved: "Approval",
    vendor_rejected: "Rejection",
  };
  return <span className="text-xs font-medium text-muted-foreground">{map[type] ?? type}</span>;
}

export default function CompliancePortalPage() {
  /* ── State ── */
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [documents, setDocuments] = useState<VendorDocument[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  // Vendor form
  const [vForm, setVForm] = useState({ companyName: "", contactName: "", contactEmail: "", category: "" });
  const [vSubmitting, setVSubmitting] = useState(false);
  const [vMsg, setVMsg] = useState("");

  // Document form
  const [dForm, setDForm] = useState({ vendorId: "", documentName: "", documentType: "" });
  const [dSubmitting, setDSubmitting] = useState(false);
  const [dMsg, setDMsg] = useState("");

  // Approval
  const [approving, setApproving] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [approvalMsg, setApprovalMsg] = useState("");

  /* ── Data fetch ── */
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
      // silent — show stale state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* ── Vendor submit ── */
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

  /* ── Document submit ── */
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

  /* ── Approve / Reject ── */
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

  /* ── Document count per vendor ── */
  function docCount(vendorId: string) {
    return documents.filter((d) => d.vendorId === vendorId).length;
  }

  return (
    <div className="min-h-screen bg-[#EDEADE]">
      {/* Header */}
      <header className="border-b bg-[#072C2C] text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-[#FF5F03]" />
            <div>
              <span className="text-lg font-semibold tracking-tight">VendorShield</span>
              <span className="ml-2 text-xs text-white/60 font-normal">Compliance Portal</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchAll}
              className="text-white/80 hover:text-white hover:bg-white/10"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8 space-y-8">

        {/* Dashboard Metrics */}
        <section aria-label="Dashboard metrics">
          <div className="flex items-center gap-2 mb-4">
            <LayoutDashboard className="h-5 w-5 text-[#072C2C]" />
            <h2 className="text-lg font-semibold text-[#072C2C]">Compliance Dashboard</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: "Total Vendors", value: metrics?.totalVendors ?? "—", icon: Building2, color: "text-[#072C2C]" },
              { label: "Pending", value: metrics?.pendingVendors ?? "—", icon: Clock, color: "text-[#D97706]" },
              { label: "Approved", value: metrics?.approvedVendors ?? "—", icon: CheckCircle2, color: "text-[#16A34A]" },
              { label: "Rejected", value: metrics?.rejectedVendors ?? "—", icon: XCircle, color: "text-[#DC2626]" },
              { label: "Documents", value: metrics?.totalDocuments ?? "—", icon: FileText, color: "text-[#072C2C]" },
              { label: "Notifications", value: metrics?.totalNotifications ?? "—", icon: Bell, color: "text-[#FF5F03]" },
            ].map(({ label, value, icon: Icon, color }) => (
              <Card key={label} className="bg-white border-border shadow-sm">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
                      <p className={`text-2xl font-bold mt-1 ${color}`}>{loading ? "…" : value}</p>
                    </div>
                    <Icon className={`h-5 w-5 mt-1 ${color} opacity-60`} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Main tabs */}
        <Tabs defaultValue="onboard">
          <TabsList className="bg-white border border-border">
            <TabsTrigger value="onboard" className="data-[state=active]:bg-[#072C2C] data-[state=active]:text-white">
              <Building2 className="h-4 w-4 mr-1.5" />
              Vendor Onboarding
            </TabsTrigger>
            <TabsTrigger value="documents" className="data-[state=active]:bg-[#072C2C] data-[state=active]:text-white">
              <Upload className="h-4 w-4 mr-1.5" />
              Documents
            </TabsTrigger>
            <TabsTrigger value="approvals" className="data-[state=active]:bg-[#072C2C] data-[state=active]:text-white">
              <UserCheck className="h-4 w-4 mr-1.5" />
              Admin Approvals
            </TabsTrigger>
            <TabsTrigger value="notifications" className="data-[state=active]:bg-[#072C2C] data-[state=active]:text-white">
              <Bell className="h-4 w-4 mr-1.5" />
              Notifications
            </TabsTrigger>
          </TabsList>

          {/* ── Vendor Onboarding ── */}
          <TabsContent value="onboard" className="mt-6">
            <div className="grid md:grid-cols-[2fr_3fr] gap-6">
              {/* Form */}
              <Card className="bg-white border-border shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base font-semibold text-[#072C2C]">Register New Vendor</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={submitVendor} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="companyName">Company Name</Label>
                      <Input
                        id="companyName"
                        placeholder="Acme Supplies Ltd."
                        value={vForm.companyName}
                        onChange={(e) => setVForm({ ...vForm, companyName: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="contactName">Contact Name</Label>
                      <Input
                        id="contactName"
                        placeholder="Jane Smith"
                        value={vForm.contactName}
                        onChange={(e) => setVForm({ ...vForm, contactName: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="contactEmail">Contact Email</Label>
                      <Input
                        id="contactEmail"
                        type="email"
                        placeholder="jane@acme.com"
                        value={vForm.contactEmail}
                        onChange={(e) => setVForm({ ...vForm, contactEmail: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="category">Vendor Category</Label>
                      <Input
                        id="category"
                        placeholder="e.g. Software, Logistics, Facilities"
                        value={vForm.category}
                        onChange={(e) => setVForm({ ...vForm, category: e.target.value })}
                        required
                      />
                    </div>
                    {vMsg && (
                      <p className={`text-sm ${vMsg.includes("success") ? "text-[#16A34A]" : "text-[#DC2626]"}`}>
                        {vMsg}
                      </p>
                    )}
                    <Button
                      type="submit"
                      disabled={vSubmitting}
                      className="w-full bg-[#072C2C] text-white hover:bg-[#0a3d3d]"
                    >
                      {vSubmitting ? "Registering…" : "Register Vendor"}
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Vendor list */}
              <Card className="bg-white border-border shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base font-semibold text-[#072C2C]">
                    Registered Vendors
                    <span className="ml-2 text-sm font-normal text-muted-foreground">({vendors.length})</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {vendors.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">No vendors registered yet.</p>
                  ) : (
                    <div className="divide-y divide-border">
                      {vendors.map((v) => (
                        <div key={v.id} className="py-3 flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-medium text-sm text-[#111827] truncate">{v.companyName}</p>
                            <p className="text-xs text-muted-foreground">{v.contactEmail} · {v.category}</p>
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

          {/* ── Documents ── */}
          <TabsContent value="documents" className="mt-6">
            <div className="grid md:grid-cols-[2fr_3fr] gap-6">
              {/* Document form */}
              <Card className="bg-white border-border shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base font-semibold text-[#072C2C]">Record Document</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={submitDocument} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="docVendorId">Vendor</Label>
                      <select
                        id="docVendorId"
                        value={dForm.vendorId}
                        onChange={(e) => setDForm({ ...dForm, vendorId: e.target.value })}
                        required
                        className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        <option value="">Select a vendor…</option>
                        {vendors.map((v) => (
                          <option key={v.id} value={v.id}>{v.companyName}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="documentName">Document Name</Label>
                      <Input
                        id="documentName"
                        placeholder="e.g. Insurance Certificate 2025"
                        value={dForm.documentName}
                        onChange={(e) => setDForm({ ...dForm, documentName: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="documentType">Document Type</Label>
                      <Input
                        id="documentType"
                        placeholder="e.g. Insurance, Tax, License, NDA"
                        value={dForm.documentType}
                        onChange={(e) => setDForm({ ...dForm, documentType: e.target.value })}
                        required
                      />
                    </div>
                    {dMsg && (
                      <p className={`text-sm ${dMsg.includes("success") ? "text-[#16A34A]" : "text-[#DC2626]"}`}>
                        {dMsg}
                      </p>
                    )}
                    <Button
                      type="submit"
                      disabled={dSubmitting}
                      className="w-full bg-[#072C2C] text-white hover:bg-[#0a3d3d]"
                    >
                      {dSubmitting ? "Recording…" : "Record Document"}
                      <Upload className="ml-1 h-4 w-4" />
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Document list */}
              <Card className="bg-white border-border shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base font-semibold text-[#072C2C]">
                    Document Records
                    <span className="ml-2 text-sm font-normal text-muted-foreground">({documents.length})</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {documents.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">No documents recorded yet.</p>
                  ) : (
                    <div className="divide-y divide-border">
                      {documents.map((d) => {
                        const vendor = vendors.find((v) => v.id === d.vendorId);
                        return (
                          <div key={d.id} className="py-3 flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-medium text-sm text-[#111827] truncate">{d.documentName}</p>
                              <p className="text-xs text-muted-foreground">
                                {d.documentType} · {vendor?.companyName ?? "Unknown vendor"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(d.uploadedAt).toLocaleDateString()}
                              </p>
                            </div>
                            <Badge variant="outline" className="text-xs shrink-0">{d.documentType}</Badge>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── Admin Approvals ── */}
          <TabsContent value="approvals" className="mt-6">
            {approvalMsg && (
              <p className={`mb-4 text-sm ${approvalMsg.includes("success") ? "text-[#16A34A]" : "text-[#DC2626]"}`}>
                {approvalMsg}
              </p>
            )}
            <Card className="bg-white border-border shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-[#072C2C]">Admin Approval Queue</CardTitle>
              </CardHeader>
              <CardContent>
                {vendors.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">No vendors to review.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-left">
                          <th className="pb-2 pr-4 font-medium text-muted-foreground">Vendor</th>
                          <th className="pb-2 pr-4 font-medium text-muted-foreground">Category</th>
                          <th className="pb-2 pr-4 font-medium text-muted-foreground">Status</th>
                          <th className="pb-2 pr-4 font-medium text-muted-foreground">Docs</th>
                          <th className="pb-2 pr-4 font-medium text-muted-foreground">Reviewer Note</th>
                          <th className="pb-2 pr-4 font-medium text-muted-foreground">Reviewed At</th>
                          <th className="pb-2 font-medium text-muted-foreground">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {vendors.map((v) => (
                          <tr key={v.id} className="border-b border-border last:border-0">
                            <td className="py-3 pr-4">
                              <p className="font-medium text-[#111827]">{v.companyName}</p>
                              <p className="text-xs text-muted-foreground">{v.contactEmail}</p>
                            </td>
                            <td className="py-3 pr-4 text-muted-foreground">{v.category}</td>
                            <td className="py-3 pr-4"><StatusBadge status={v.status} /></td>
                            <td className="py-3 pr-4 text-center font-medium text-[#072C2C]">{docCount(v.id)}</td>
                            <td className="py-3 pr-4 max-w-[180px]">
                              {v.status !== "pending" ? (
                                <span className="text-xs text-muted-foreground">{v.reviewerNote || "—"}</span>
                              ) : (
                                <Textarea
                                  placeholder="Add review note…"
                                  className="text-xs min-h-[60px] resize-none"
                                  value={reviewNotes[v.id] || ""}
                                  onChange={(e) =>
                                    setReviewNotes((prev) => ({ ...prev, [v.id]: e.target.value }))
                                  }
                                />
                              )}
                            </td>
                            <td className="py-3 pr-4 text-xs text-muted-foreground">
                              {v.reviewedAt ? new Date(v.reviewedAt).toLocaleDateString() : "—"}
                            </td>
                            <td className="py-3">
                              {v.status === "pending" ? (
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    disabled={approving === v.id + "approved"}
                                    onClick={() => handleApproval(v.id, "approved")}
                                    className="bg-[#16A34A] text-white hover:bg-[#15803d] h-7 text-xs"
                                  >
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    {approving === v.id + "approved" ? "…" : "Approve"}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    disabled={approving === v.id + "rejected"}
                                    onClick={() => handleApproval(v.id, "rejected")}
                                    className="h-7 text-xs"
                                  >
                                    <XCircle className="h-3 w-3 mr-1" />
                                    {approving === v.id + "rejected" ? "…" : "Reject"}
                                  </Button>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  By {v.reviewedBy || "admin"}
                                </span>
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

          {/* ── Notifications ── */}
          <TabsContent value="notifications" className="mt-6">
            <Card className="bg-white border-border shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-[#072C2C]">
                  Notification Audit Trail
                  <span className="ml-2 text-sm font-normal text-muted-foreground">({notifications.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {notifications.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">No notifications recorded yet.</p>
                ) : (
                  <div className="divide-y divide-border">
                    {notifications.map((n) => (
                      <div key={n.id} className="py-3 flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <NotifTypeLabel type={n.type} />
                            <StatusBadge status={n.status} />
                          </div>
                          <p className="text-sm text-[#111827]">{n.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(n.createdAt).toLocaleString()}
                          </p>
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

      {/* Footer */}
      <footer className="border-t bg-[#072C2C] text-white/60 mt-12">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between text-xs">
          <span>VendorShield Compliance Portal</span>
          <span>Vendor onboarding · Document review · Admin approval · Audit trail</span>
        </div>
      </footer>
    </div>
  );
}
