import React, { useEffect, useState } from "react";
import supabase from "../lib/supabaseClient";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Loader2,
  Search,
  FileText,
} from "lucide-react";

const ExpenseRecordsView = ({ onClose }) => {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState([]);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});

  // =====================================================
  // FETCH DATA
  // =====================================================

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("employee_expense_payouts")
        .select(
          `
          *,
          entity_master(entity_name),
          departments_master(dept_name)
        `
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRecords(data || []);
    } catch (err) {
      console.error(err);
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  // =====================================================
  // DELETE
  // =====================================================

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this record?"
    );
    if (!confirmDelete) return;

    try {
      const { error } = await supabase.rpc("delete_employee_expense_complete", {
        p_payout_id: id,
      });
      if (error) throw error;
      setRecords((prev) => prev.filter((item) => item.id !== id));
      alert("Deleted Successfully");
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };

  // =====================================================
  // EDIT
  // =====================================================

  const startEdit = (row) => {
    setEditingId(row.id);
    setEditData({
      payment_amount: row.payment_amount,
      income_tax_deducted: row.income_tax_deducted,
      remarks: row.remarks || "",
      payment_description: row.payment_description || "",
    });
  };

  // =====================================================
  // UPDATE
  // =====================================================

  const handleUpdate = async () => {
    try {
      const { error } = await supabase
        .from("employee_expense_payouts")
        .update({
          payment_amount: parseFloat(editData.payment_amount),
          income_tax_deducted: parseFloat(editData.income_tax_deducted),
          net_payment:
            parseFloat(editData.payment_amount) -
            parseFloat(editData.income_tax_deducted),
          payment_description: editData.payment_description,
          remarks: editData.remarks,
        })
        .eq("id", editingId);

      if (error) throw error;
      alert("Updated Successfully");
      setEditingId(null);
      fetchRecords();
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };

  // =====================================================
  // FILTERED RECORDS
  // =====================================================

  const filtered = records.filter((r) => {
    const text = `
      ${r.emp_code}
      ${r.employee_name}
      ${r.pay_head}
      ${r.payment_description}
    `.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  // =====================================================
  // STATS
  // =====================================================

  const totalAmount = filtered.reduce(
    (sum, r) => sum + (parseFloat(r.payment_amount) || 0),
    0
  );
  const totalTax = filtered.reduce(
    (sum, r) => sum + (parseFloat(r.income_tax_deducted) || 0),
    0
  );
  const netPayout = totalAmount - totalTax;

  const formatINR = (val) =>
    `₹ ${Number(val).toLocaleString("en-IN")}`;

  return (
    <div className="fixed inset-0 z-[999999] bg-[#f7f8fb] overflow-auto font-sans">

      {/* ── HEADER ── */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-[#eef3fa] hover:bg-[#dde9f7] flex items-center justify-center text-[#1e3a5f] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-[#0f172a] text-[17px] font-semibold tracking-tight">
              Employee Expense Records
            </h2>
            <p className="text-slate-400 text-xs mt-0.5">View · Edit · Delete</p>
          </div>
        </div>

        {/* SEARCH */}
        <div className="relative w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search employee, pay head…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 bg-[#f7f8fb] border border-slate-200 rounded-xl pl-9 pr-4 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#1e3a5f] focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* ── STATS BAR ── */}
      <div className="px-6 pt-5 grid grid-cols-4 gap-3">
        {[
          { label: "Total Records", value: filtered.length, mono: false },
          { label: "Total Amount", value: formatINR(totalAmount), mono: true },
          { label: "Tax Deducted", value: formatINR(totalTax), mono: true },
          { label: "Net Payout", value: formatINR(netPayout), mono: true },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white border border-slate-200 rounded-xl px-5 py-3.5"
          >
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">
              {s.label}
            </p>
            <p
              className={`text-[20px] font-semibold text-[#0f172a] mt-1 ${
                s.mono ? "font-mono" : ""
              }`}
            >
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* ── TABLE ── */}
      <div className="px-6 pt-4 pb-8">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 text-[#1e3a5f] animate-spin" />
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-[#f7f8fb] border-b border-slate-200">
                    {[
                      "Emp Code",
                      "Employee",
                      "Department",
                      "Pay Head",
                      "Amount",
                      "Tax",
                      "Description",
                      "Remarks",
                      "Actions",
                    ].map((h) => (
                      <th
                        key={h}
                        className={`px-4 py-3 text-[11.5px] font-medium text-slate-400 uppercase tracking-wide whitespace-nowrap ${
                          h === "Actions" ? "text-center" : "text-left"
                        }`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {filtered.map((row, idx) => (
                    <tr
                      key={row.id}
                      className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                        idx === filtered.length - 1 ? "border-b-0" : ""
                      }`}
                    >
                      {/* Emp Code */}
                      <td className="px-4 py-3">
                        <span className="font-mono text-[12px] font-medium bg-[#eef3fa] text-[#1e3a5f] px-2.5 py-1 rounded-md">
                          {row.emp_code}
                        </span>
                      </td>

                      {/* Employee Name */}
                      <td className="px-4 py-3 font-medium text-[#0f172a] whitespace-nowrap">
                        {row.employee_name}
                      </td>

                      {/* Department */}
                      <td className="px-4 py-3">
                        <span className="text-[11.5px] bg-slate-100 text-slate-500 px-2.5 py-1 rounded-md whitespace-nowrap">
                          {row.departments_master?.dept_name}
                        </span>
                      </td>

                      {/* Pay Head */}
                      <td className="px-4 py-3 text-slate-500 text-[12.5px] whitespace-nowrap">
                        {row.pay_head}
                      </td>

                      {/* Amount — editable */}
                      <td className="px-4 py-3">
                        {editingId === row.id ? (
                          <input
                            value={editData.payment_amount}
                            onChange={(e) =>
                              setEditData({
                                ...editData,
                                payment_amount: e.target.value,
                              })
                            }
                            className="w-[110px] border border-slate-200 bg-[#f7f8fb] rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-800 focus:outline-none focus:border-[#1e3a5f] focus:bg-white transition-all"
                          />
                        ) : (
                          <span className="font-mono font-medium text-[#0f172a]">
                            ₹ {Number(row.payment_amount).toLocaleString("en-IN")}
                          </span>
                        )}
                      </td>

                      {/* Tax — editable */}
                      <td className="px-4 py-3">
                        {editingId === row.id ? (
                          <input
                            value={editData.income_tax_deducted}
                            onChange={(e) =>
                              setEditData({
                                ...editData,
                                income_tax_deducted: e.target.value,
                              })
                            }
                            className="w-[100px] border border-slate-200 bg-[#f7f8fb] rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-800 focus:outline-none focus:border-[#1e3a5f] focus:bg-white transition-all"
                          />
                        ) : (
                          <span className="font-mono text-amber-700 text-[12.5px]">
                            ₹ {Number(row.income_tax_deducted).toLocaleString("en-IN")}
                          </span>
                        )}
                      </td>

                      {/* Description — editable */}
                      <td className="px-4 py-3">
                        {editingId === row.id ? (
                          <input
                            value={editData.payment_description}
                            onChange={(e) =>
                              setEditData({
                                ...editData,
                                payment_description: e.target.value,
                              })
                            }
                            className="w-[200px] border border-slate-200 bg-[#f7f8fb] rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-[#1e3a5f] focus:bg-white transition-all"
                          />
                        ) : (
                          <span className="text-slate-500 text-[12.5px] max-w-[180px] truncate block">
                            {row.payment_description}
                          </span>
                        )}
                      </td>

                      {/* Remarks — editable */}
                      <td className="px-4 py-3">
                        {editingId === row.id ? (
                          <input
                            value={editData.remarks}
                            onChange={(e) =>
                              setEditData({
                                ...editData,
                                remarks: e.target.value,
                              })
                            }
                            className="w-[160px] border border-slate-200 bg-[#f7f8fb] rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-[#1e3a5f] focus:bg-white transition-all"
                          />
                        ) : (
                          <span className="text-slate-400 text-xs italic">
                            {row.remarks || "—"}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          {editingId === row.id ? (
                            <button
                              onClick={handleUpdate}
                              className="h-[30px] px-4 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-semibold hover:bg-emerald-100 transition-colors"
                            >
                              Save
                            </button>
                          ) : (
                            <button
                              onClick={() => startEdit(row)}
                              className="w-8 h-8 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 flex items-center justify-center hover:bg-amber-100 transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            onClick={() => handleDelete(row.id)}
                            className="w-8 h-8 rounded-lg border border-red-200 bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-100 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Empty state */}
            {!filtered.length && (
              <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
                <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center">
                  <FileText className="w-5 h-5 opacity-50" />
                </div>
                <p className="text-sm">No records found</p>
              </div>
            )}

            {/* Footer */}
            <div className="border-t border-slate-100 px-5 py-2.5 flex items-center justify-between">
              <div className="text-xs text-slate-400">
                Showing{" "}
                <span className="bg-[#eef3fa] text-[#1e3a5f] font-semibold text-[11px] px-2.5 py-0.5 rounded-full">
                  {filtered.length}
                </span>{" "}
                records
              </div>
              <div className="text-[11px] text-slate-300">Last updated just now</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpenseRecordsView;