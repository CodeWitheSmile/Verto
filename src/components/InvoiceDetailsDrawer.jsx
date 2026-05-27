import React from "react";
import { X, FileText, Building2, Users, User } from "lucide-react";
import Card from "./ui/Card";
import { useEffect, useState } from "react";
import supabase from "../lib/supabaseClient";

const InvoiceDetailsDrawer = ({ invoice, isOpen, onClose }) => {
  const [details, setDetails] = useState(null);

  useEffect(() => {
    if (!invoice || !isOpen) return;
    setDetails(null); // reset on each open

    const fetchDetails = async () => {
  // First fetch the invoice directly
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", invoice.dbId)
    .single();

  if (error) {
    console.error("Fetch error:", error);
    return;
  }

  // Then fetch related names separately
  const [clientRes, deptRes, entityRes] = await Promise.all([
    supabase.from("clients_master").select("client_name").eq("id", data.client_id).single(),
    supabase.from("departments_master").select("dept_name").eq("id", data.department_id).single(),
    supabase.from("entity_master").select("entity_name").eq("id", data.entity_id).single(),
  ]);

  setDetails({
    ...data,
    clients_master: clientRes.data,
    departments_master: deptRes.data,
    entity_master: entityRes.data,
  });
};

    fetchDetails();
  }, [invoice, isOpen]);

  if (!isOpen || !invoice) return null;

  const formatCurrency = (val) =>
    `₹ ${Number(val || 0).toLocaleString("en-IN")}`;

  const deptName = details?.departments_master?.dept_name;
  const isRecTemp = ["Recruitment", "Temporary"].includes(deptName);
  const isOS = deptName === "Operations";

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Overlay */}
      <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col">
        {/* Header */}
        <div
          className="px-6 py-5 text-white flex-shrink-0"
          style={{
            background: "linear-gradient(135deg, #1d4ed8 0%, #1e40af 60%, #1e3a8a 100%)",
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Invoice Details
              </h2>
              <p className="text-blue-200 text-xs mt-0.5">#{invoice.id}</p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/15 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-gray-50">
          {!details ? (
            <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
              Loading...
            </div>
          ) : (
            <>
              {/* Client */}
              <Card className="border-gray-200">
                <Card.Content className="p-4 space-y-1">
                  <p className="text-xs text-gray-400 uppercase font-semibold tracking-wider">Client</p>
                  <p className="font-semibold text-gray-800 flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-400" />
                    {details.clients_master?.client_name || invoice.client}
                  </p>
                </Card.Content>
              </Card>

              {/* Department */}
              <Card className="border-gray-200">
                <Card.Content className="p-4 space-y-1">
                  <p className="text-xs text-gray-400 uppercase font-semibold tracking-wider">Department</p>
                  <p className="font-semibold text-gray-800">
                    {deptName || invoice.dept}
                  </p>
                </Card.Content>
              </Card>

              {/* Entity */}
              <Card className="border-gray-200">
                <Card.Content className="p-4 space-y-1">
                  <p className="text-xs text-gray-400 uppercase font-semibold tracking-wider">Entity</p>
                  <p className="font-semibold text-gray-800 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    {details.entity_master?.entity_name || invoice.entity}
                  </p>
                </Card.Content>
              </Card>

              {/* ── Employee Name — only for Recruitment / Temporary ── */}
              {isRecTemp && (
                <Card className="border-blue-200 bg-blue-50">
                  <Card.Content className="p-4 space-y-1">
                    <p className="text-xs text-blue-500 uppercase font-semibold tracking-wider">
                      Employee Name
                    </p>
                    <p className="font-semibold flex items-center gap-2 text-gray-800">
                      <User className="w-4 h-4 text-blue-500" />
                      {details.employee_name || (
                        <span className="text-gray-400 font-normal italic">
                          Not provided
                        </span>
                      )}
                    </p>
                  </Card.Content>
                </Card>
              )}

              {/* Invoice Value */}
              <Card className="border-gray-200">
                <Card.Content className="p-4 space-y-1">
                  <p className="text-xs text-gray-400 uppercase font-semibold tracking-wider">Invoice Value</p>
                  <p className="text-xl font-bold text-gray-900">
                    {formatCurrency(details.invoice_value || invoice.invValue)}
                  </p>
                </Card.Content>
              </Card>

              {/* Outstanding */}
              <Card className="border-rose-100">
                <Card.Content className="p-4 space-y-1">
                  <p className="text-xs text-gray-400 uppercase font-semibold tracking-wider">Outstanding</p>
                  <p className="text-xl font-bold text-rose-600">
                    {formatCurrency(details.receivable_amount || invoice.notRecvd)}
                  </p>
                </Card.Content>
              </Card>

              {/* Delay Days */}
              <Card className="border-gray-200">
                <Card.Content className="p-4 space-y-1">
                  <p className="text-xs text-gray-400 uppercase font-semibold tracking-wider">Delay Days</p>
                  <p className="text-xl font-bold text-amber-600">
                    {invoice.delayDays}d
                  </p>
                </Card.Content>
              </Card>

              {/* ── OS Extra Details ── */}
              {isOS && (
                <Card className="border-amber-200 bg-amber-50">
                  <Card.Content className="p-4 space-y-2">
                    <p className="text-xs text-amber-600 uppercase font-semibold tracking-wider mb-3">
                      OS Department Details
                    </p>
                    {[
                      ["Employee Count", details.employee_count],
                      ["Gross Value", `₹ ${Number(details.gross_value || 0).toLocaleString("en-IN")}`],
                      ["Net In Hand", `₹ ${Number(details.net_in_hand || 0).toLocaleString("en-IN")}`],
                      ["Co PF", `₹ ${Number(details.co_pf || 0).toLocaleString("en-IN")}`],
                      ["Co ESI", `₹ ${Number(details.co_esi || 0).toLocaleString("en-IN")}`],
                      ["CTC", `₹ ${Number(details.ctc || 0).toLocaleString("en-IN")}`],
                    ].map(([label, val]) => (
                      <div key={label} className="flex justify-between items-center py-1 border-b border-amber-100 last:border-0">
                        <span className="text-sm text-gray-600">{label}</span>
                        <span className="text-sm font-semibold text-gray-800">{val}</span>
                      </div>
                    ))}
                  </Card.Content>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default InvoiceDetailsDrawer;