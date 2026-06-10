import React, { useEffect, useState } from "react";
import { X, FileText, Building2, Users, User, Clock } from "lucide-react";
import Card from "./ui/Card";
import supabase from "../lib/supabaseClient";

const InvoiceDetailsDrawer = ({ invoice, isOpen, onClose }) => {
  const [details, setDetails] = useState(null);

  useEffect(() => {
    if (!invoice || !isOpen) return;
    setDetails(null);

    const fetchDetails = async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("id", invoice.dbId)
        .single();

      if (error) {
        console.error("Fetch error:", error);
        return;
      }

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
      <div
        className="flex-1 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="w-full max-w-sm bg-white h-full shadow-xl flex flex-col">

        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
              <FileText className="w-4 h-4 text-gray-500" />
            </div>
            <div>
              <h2 className="text-sm font-medium text-gray-900 leading-tight">
                Invoice details
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">#{invoice.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-md border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Status badges */}
        {details && (
          <div className="px-5 pt-4 flex items-center gap-2">
            {invoice.delayDays > 0 && (
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-amber-50 text-amber-600 border border-amber-200">
                {invoice.delayDays}d overdue
              </span>
            )}
            {deptName && (
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
                {deptName}
              </span>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {!details ? (
            <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
              Loading...
            </div>
          ) : (
            <>
              {/* Amounts row */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1.5">
                    Invoice value
                  </p>
                  <p className="text-lg font-medium text-gray-900">
                    {formatCurrency(details.invoice_value || invoice.invValue)}
                  </p>
                </div>
                <div className="bg-rose-50 rounded-xl p-4">
                  <p className="text-xs text-rose-400 uppercase tracking-wider font-medium mb-1.5">
                    Outstanding
                  </p>
                  <p className="text-lg font-medium text-rose-600">
                    {formatCurrency(details.receivable_amount || invoice.notRecvd)}
                  </p>
                </div>
              </div>

              {/* Client */}
              <div className="bg-white border border-gray-100 rounded-xl p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <Users className="w-4 h-4 text-gray-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-0.5">
                    Client
                  </p>
                  <p className="text-sm font-medium text-gray-900">
                    {details.clients_master?.client_name || invoice.client}
                  </p>
                </div>
              </div>

              {/* Dept + Entity */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white border border-gray-100 rounded-xl p-4">
                  <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1">
                    Department
                  </p>
                  <p className="text-sm font-medium text-gray-900">
                    {deptName || invoice.dept}
                  </p>
                </div>
                <div className="bg-white border border-gray-100 rounded-xl p-4">
                  <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1">
                    Entity
                  </p>
                  <p className="text-sm font-medium text-gray-900 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    {details.entity_master?.entity_name || invoice.entity}
                  </p>
                </div>
              </div>

              {/* Employee Name — Recruitment / Temporary only */}
              {isRecTemp && (
                <div className="bg-white border border-gray-100 rounded-xl p-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-0.5">
                      Employee name
                    </p>
                    {details.employee_name ? (
                      <p className="text-sm font-medium text-gray-900">
                        {details.employee_name}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-400 italic">Not provided</p>
                    )}
                  </div>
                </div>
              )}

              {/* Delay */}
              <div className="bg-white border border-gray-100 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-0.5">
                      Delay
                    </p>
                    <p className="text-xs text-gray-400">Past due date</p>
                  </div>
                </div>
                <p className="text-xl font-medium text-amber-500">
                  {invoice.delayDays}d
                </p>
              </div>

              {/* OS Department Details */}
              {isOS && (
                <div className="bg-white border border-gray-100 rounded-xl p-4">
                  <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-3">
                    OS department details
                  </p>
                  <div className="space-y-0.5">
                    {[
                      ["Employee count", details.employee_count, false],
                      ["Gross value", formatCurrency(details.gross_value), false],
                      ["Net in hand", formatCurrency(details.net_in_hand), false],
                      ["Co PF", formatCurrency(details.co_pf), true],
                      ["Co ESI", formatCurrency(details.co_esi), true],
                      ["LWF Tax", formatCurrency(details.lwf_tax), true],
                      ["PT Tax", formatCurrency(details.pt_tax), true],
                      ["Other Ded", formatCurrency(details.other_ded), true],
                      ["CTC", formatCurrency(details.ctc), false],
                    ].map(([label, val, isCompliance]) => (
                      <div
                        key={label}
                        className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0"
                      >
                        <span className="text-sm text-gray-500">{label}</span>
                        <span className={`text-sm font-medium ${isCompliance ? "text-blue-600" : "text-gray-800"}`}>
                          {val}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Total Compliance Payable */}
                  <div className="mt-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 flex justify-between items-center">
                    <div>
                      <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">
                        Total Compliance Payable
                      </p>
                      <p className="text-xs text-amber-500 mt-0.5">
                        Co PF + Co ESI + LWF + PT + Other Ded
                      </p>
                    </div>
                    <p className="text-base font-bold text-amber-600">
                      {formatCurrency(
                        (details.co_pf || 0) +
                        (details.co_esi || 0) +
                        (details.lwf_tax || 0) +
                        (details.pt_tax || 0) +
                        (details.other_ded || 0)
                      )}
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default InvoiceDetailsDrawer;