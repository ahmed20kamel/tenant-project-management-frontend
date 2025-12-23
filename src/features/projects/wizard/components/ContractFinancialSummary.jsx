import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../../../services/api";
import InfoTip from "./InfoTip";
import { formatMoney } from "../../../../utils/formatters";
import { n, round, feeInclusive } from "../../../../utils/contractFinancial";

/* =================== Main =================== */
export default function ContractFinancialSummary({ projectId }) {
  const { t, i18n } = useTranslation();
  const isAR = /^ar\b/i.test(i18n.language || "");
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // تحميل العقد
  useEffect(() => {
    if (!projectId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    api
      .get(`projects/${projectId}/contract/`)
      .then(({ data }) => {
        if (Array.isArray(data) && data.length) setContract(data[0]);
        else if (data && typeof data === "object") setContract(data);
        else setContract(null);
      })
      .catch((e) => {
        // ✅ معالجة أفضل للأخطاء - منع عرض HTML الخام
        let errorMessage = t("contract_load_error");
        
        if (e?.response?.data) {
          const errorData = e.response.data;
          // إذا كان الخطأ HTML (يبدأ بـ <!DOCTYPE أو <html)
          if (typeof errorData === "string" && (errorData.trim().startsWith("<!DOCTYPE") || errorData.trim().startsWith("<html"))) {
            // محاولة استخراج رسالة خطأ من HTML
            const titleMatch = errorData.match(/<title>(.*?)<\/title>/i);
            if (titleMatch) {
              errorMessage = `${t("contract_load_error")}: ${titleMatch[1]}`;
            } else {
              errorMessage = t("contract_load_error");
            }
          } else if (typeof errorData === "string") {
            errorMessage = errorData;
          } else if (errorData?.detail) {
            errorMessage = errorData.detail;
          } else if (errorData?.message) {
            errorMessage = errorData.message;
          } else {
            errorMessage = JSON.stringify(errorData);
          }
        } else if (e?.message) {
          errorMessage = e.message;
        }
        
        setError(errorMessage);
        setContract(null);
      })
      .finally(() => setLoading(false));
  }, [projectId, t]);

  // كل الحسابات تتم هنا بشكل آمن
  const computed = useMemo(() => {
    try {
      if (!contract) return { error: null, data: null };

      const c = contract;

      // إجماليات
      const grossTotal = n(c.total_project_value);
      const grossBank =
        c.contract_classification === "housing_loan_program" ? n(c.total_bank_value) : 0;
      const grossOwner = n(c.total_owner_value) || Math.max(0, grossTotal - grossBank);

      // نسب الاستشاري
      const ownerIncludes = c.owner_includes_consultant === true || c.owner_includes_consultant === "yes";
      const bankIncludes = c.bank_includes_consultant === true || c.bank_includes_consultant === "yes";

      const ownerPct = ownerIncludes
        ? n(c.owner_fee_design_percent) + n(c.owner_fee_supervision_percent) +
          (c.owner_fee_extra_mode === "percent" ? n(c.owner_fee_extra_value) : 0)
        : 0;

      const bankPct = bankIncludes
        ? n(c.bank_fee_design_percent) + n(c.bank_fee_supervision_percent) +
          (c.bank_fee_extra_mode === "percent" ? n(c.bank_fee_extra_value) : 0)
        : 0;

      const totalPct =
        ownerPct && bankPct && Math.abs(ownerPct - bankPct) < 1e-6
          ? ownerPct
          : ownerPct || bankPct || 0;

      // تفكيك الأتعاب من الإجماليات
      const total = feeInclusive(grossTotal, totalPct);
      const bank = feeInclusive(grossBank, bankPct || totalPct);
      const owner = feeInclusive(grossOwner, ownerPct || totalPct);

      // حساب المبلغ المستحق للمقاول (Payable Amount to Contractor)
      // المالك يدفع المبلغ الكامل (شامل أتعاب الاستشاري)، البنك يدفع المبلغ بعد خصم أتعاب الاستشاري
      // Payable Amount = grossOwner (full) + bank.net (after fees) = grossTotal - bank.fee
      const payableAmount = grossOwner + bank.net; // Same as: grossTotal - bank.fee

      // دوال العرض
      const A = (v) => formatMoney(round(n(v)));
      const vat = (v) => round(n(v) * 0.05);
      const inc = (v) => round(n(v) + vat(v));

      return {
        error: null,
        data: {
          c,
          grossTotal,
          grossBank,
          grossOwner,
          ownerPct,
          bankPct,
          totalPct,
          total,
          bank,
          owner,
          payableAmount,
          A,
          vat,
          inc,
        },
      };
    } catch (e) {
      return { error: e, data: null };
    }
  }, [contract]);

  if (loading) {
    return (
      <div className="card text-center" style={{ padding: 20 }}>
        {t("contract_loading")}
      </div>
    );
  }

  if (error) {
    return (
      <div className="card alert error" style={{ direction: isAR ? "rtl" : "ltr" }}>
        <div className="fw-700 mb-12">
          {t("contract_load_error")}
        </div>
        <div className="pre-wrap mono" style={{ background: "var(--error-bg)", padding: 10, borderRadius: 6, border: "1px solid var(--error-ink)" }}>
          {typeof error === "string" ? error : JSON.stringify(error, null, 2)}
        </div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="card text-center" style={{ padding: 20 }}>
        {t("contract_no_data")}
      </div>
    );
  }

  if (computed.error) {
    return (
      <div className="card alert error" style={{ direction: isAR ? "rtl" : "ltr" }}>
        <div className="fw-700 mb-12">
          {t("contract_summary_error")}
        </div>
        <div className="pre-wrap mono" style={{ background: "var(--error-bg)", padding: 10, borderRadius: 6, border: "1px solid var(--error-ink)" }}>
          {`Error: ${computed.error?.message || String(computed.error)}\n\nContract payload:\n` +
            JSON.stringify(contract, null, 2)}
        </div>
      </div>
    );
  }

  if (!computed.data) {
    return (
      <div className="card text-center" style={{ padding: 20 }}>
        {t("contract_insufficient_data")}
      </div>
    );
  }

  // تفكيك القيم المحسوبة
  const { grossTotal, grossBank, grossOwner, ownerPct, bankPct, totalPct, total, bank, owner, payableAmount, A, vat, inc } = computed.data;
  
  // ✅ تحديد نوع التمويل
  const isPrivateFunding = contract?.contract_classification === "private_funding";

  /* ===== ستايل متناسق مع النظام ===== */
  const S = {
    sectionTitle: {
      background: "var(--primary)",
      color: "white",
      fontWeight: 700,
      padding: "14px 18px",
      borderRadius: "8px 8px 0 0",
      fontSize: "18px",
      fontFamily: '"Times New Roman", Times, serif',
      textAlign: isAR ? "right" : "left",
      direction: isAR ? "rtl" : "ltr",
    },
    th: {
      background: "var(--surface-2)",
      border: "1px solid var(--border)",
      padding: "14px 18px",
      textAlign: isAR ? "right" : "left",
      fontWeight: 600,
      fontSize: "16px",
      fontFamily: '"Times New Roman", Times, serif',
      color: "var(--ink)",
    },
    td: {
      border: "1px solid var(--border)",
      padding: "14px 18px",
      verticalAlign: "middle",
      background: "var(--surface)",
      fontFamily: '"Times New Roman", Times, serif',
      fontSize: "16px",
    },
    tdValue: {
      border: "1px solid var(--border)",
      padding: "14px 18px",
      textAlign: isAR ? "left" : "right",
      verticalAlign: "middle",
      background: "var(--surface)",
      fontWeight: 500,
      fontFamily: '"Times New Roman", Times, serif',
      fontSize: "17px",
      color: "var(--ink)",
    },
    tdTotal: {
      border: "1px solid var(--border)",
      padding: "14px 18px",
      textAlign: isAR ? "left" : "right",
      verticalAlign: "middle",
      background: "var(--primary-50)",
      fontWeight: 700,
      fontFamily: '"Times New Roman", Times, serif',
      fontSize: "18px",
      color: "var(--primary-700)",
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
      tableLayout: "fixed",
      direction: isAR ? "rtl" : "ltr",
      marginBottom: 0,
    },
    gap: { height: "16px" },
    tableWrapper: {
      display: "flex",
      flexDirection: "column",
      height: "100%",
    },
    tablesGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: "16px",
      marginBottom: "16px",
      alignItems: "stretch",
    },
    fullWidthTable: {
      width: "100%",
    },
    emptyRow: {
      height: "8px",
      border: "none",
      background: "transparent",
    },
  };

  /* ===== الملاحظات ===== */
  const notes = {
    total_contract: t("contract_note_total_contract"),
    fee_total: t("contract_note_fee_total"),
    net_total: t("contract_note_net_total"),
    bank_total: t("contract_note_bank_total"),
    bank_fee: t("contract_note_bank_fee"),
    bank_net: t("contract_note_bank_net"),
    owner_total: t("contract_note_owner_total"),
    owner_fee: t("contract_note_owner_fee"),
    owner_net: t("contract_note_owner_net"),
  };

  /* ===== صفوف الجداول ===== */
  const RowAmount = (label, value, noteKey, percent = null, isTotal = false, isPercentageRow = false) => (
    <tr key={label}>
      <td style={S.td}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontFamily: '"Times New Roman", Times, serif' }}>
          <span style={{ fontSize: "16px" }}>{label}</span>
          {percent !== null && percent > 0 && (
            <span style={{ 
              color: "var(--muted)", 
              fontSize: "14px", 
              fontWeight: 400,
              marginInlineStart: "4px",
              fontFamily: '"Times New Roman", Times, serif'
            }}>
              ({percent}%)
            </span>
          )}
         <InfoTip text={notes[noteKey]} />
        </div>
      </td>
      <td style={isTotal ? S.tdTotal : S.tdValue}>
        {isPercentageRow ? (
          <span style={{ 
            fontSize: "15px", 
            color: "var(--muted)",
            fontFamily: '"Times New Roman", Times, serif'
          }}>
            {percent !== null && percent > 0 ? `${percent}%` : "0%"}
          </span>
        ) : (
          A(value)
        )}
      </td>
    </tr>
  );

  const RowVAT = (label, amt, isTotal = false) => (
    <tr key={label}>
      <td style={{ ...S.td, fontSize: "16px", fontFamily: '"Times New Roman", Times, serif' }}>{label}</td>
      <td style={isTotal ? S.tdTotal : S.tdValue}>{A(amt)}</td>
      <td style={isTotal ? S.tdTotal : S.tdValue}>{A(vat(amt))}</td>
      <td style={isTotal ? S.tdTotal : S.tdValue}>{A(inc(amt))}</td>
    </tr>
  );

  return (
      <div className="card" style={{ overflowX: "auto" }}>
      {/* ثلاث بطاقات جديدة - إجمالي مبلغ العقد، المبلغ الفعلي، مبلغ الاستحقاق */}
      <div style={{ ...S.tablesGrid, gridTemplateColumns: isPrivateFunding ? "repeat(2, 1fr)" : "repeat(3, 1fr)" }}>
      {/* ① إجمالي مبلغ العقد (شامل الضريبة / غير شامل / VAT) */}
        <div style={S.tableWrapper}>
          <div style={S.sectionTitle}>
            {t("contract_total_contract_amount_with_vat") || "إجمالي مبلغ العقد"}
          </div>
          <table style={{ ...S.table, flex: 1 }}>
            <thead>
              <tr>
                <th style={{ ...S.th, width: "60%" }}>{t("contract_description")}</th>
                <th style={{ ...S.th, width: "40%" }}>{t("contract_value_aed")}</th>
              </tr>
            </thead>
            <tbody>
              {RowAmount(
                t("contract_amount_excl_vat") || "المبلغ غير شامل الضريبة",
                grossTotal,
                "total_contract_vat",
                null,
                false
              )}
              {RowAmount(
                t("contract_vat_5"),
                vat(grossTotal),
                "total_contract_vat"
              )}
              {RowAmount(
                t("contract_total_incl_vat"),
                inc(grossTotal),
                "total_contract_vat",
                null,
                true
              )}
            </tbody>
          </table>
        </div>

      {/* ② المبلغ الفعلي للتعاقد (Actual Contract Amount) */}
        <div style={S.tableWrapper}>
          <div style={S.sectionTitle}>
            {t("contract_actual_contract_amount")}
          </div>
          <table style={{ ...S.table, flex: 1 }}>
            <thead>
              <tr>
                <th style={{ ...S.th, width: "60%" }}>{t("contract_description")}</th>
                <th style={{ ...S.th, width: "40%" }}>{t("contract_value_aed")}</th>
              </tr>
            </thead>
            <tbody>
              {RowAmount(
                t("contract_amount_excl_vat") || "المبلغ غير شامل الضريبة",
                total.net,
                "actual_contract_vat",
                null,
                false
              )}
              {RowAmount(
                t("contract_vat_5"),
                vat(total.net),
                "actual_contract_vat"
              )}
              {RowAmount(
                t("contract_total_incl_vat"),
                inc(total.net),
                "actual_contract_vat",
                null,
                true
              )}
            </tbody>
          </table>
        </div>

      {/* ③ مبلغ الاستحقاق المالي للمقاول (Payable Amount to Contractor) */}
        <div style={S.tableWrapper}>
          <div style={S.sectionTitle}>
            {t("contract_payable_amount_contractor")}
          </div>
          <table style={{ ...S.table, flex: 1 }}>
            <thead>
              <tr>
                <th style={{ ...S.th, width: "60%" }}>{t("contract_description")}</th>
                <th style={{ ...S.th, width: "40%" }}>{t("contract_value_aed")}</th>
              </tr>
            </thead>
            <tbody>
              {RowAmount(
                t("contract_amount_excl_vat") || "المبلغ غير شامل الضريبة",
                payableAmount,
                "payable_contractor_vat",
                null,
                false
              )}
              {RowAmount(
                t("contract_vat_5"),
                vat(payableAmount),
                "payable_contractor_vat"
              )}
              {RowAmount(
                t("contract_total_incl_vat"),
                inc(payableAmount),
                "payable_contractor_vat",
                null,
                true
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* أول 3 جداول في صف واحد */}
      <div style={{ ...S.tablesGrid, gridTemplateColumns: isPrivateFunding ? "repeat(2, 1fr)" : "repeat(3, 1fr)" }}>
      {/* ① إجمالي مبالغ العقد */}
        <div style={S.tableWrapper}>
          <div style={S.sectionTitle}>
        {t("contract_total_title")}
      </div>
      <table style={{ ...S.table, flex: 1 }}>
        <thead>
          <tr>
                <th style={{ ...S.th, width: "60%" }}>{t("contract_description")}</th>
                <th style={{ ...S.th, width: "40%" }}>{t("contract_value_excl_vat")}</th>
          </tr>
        </thead>
        <tbody>
          {RowAmount(
            t("contract_total_contract_amount"),
            grossTotal,
                "total_contract",
                null,
                true
          )}
          {RowAmount(
            t("contract_consultant_percentage"),
            0,
            "fee_total",
                totalPct || 0,
                false,
                true
          )}
          {RowAmount(
            t("contract_total_consultant_fees"),
            total.fee,
            "fee_total"
          )}
          {RowAmount(
            t("contract_total_actual_contractor"),
            total.net,
                "net_total",
                null,
                true
          )}
        </tbody>
      </table>
        </div>

      {/* ② بنك - ✅ إخفاء عند تمويل المالك فقط */}
      {!isPrivateFunding && (
        <div style={S.tableWrapper}>
          <div style={S.sectionTitle}>
        {t("contract_bank_share_title")}
      </div>
      <table style={{ ...S.table, flex: 1 }}>
        <thead>
          <tr>
                <th style={{ ...S.th, width: "60%" }}>{t("contract_description")}</th>
                <th style={{ ...S.th, width: "40%" }}>{t("contract_value_aed")}</th>
          </tr>
        </thead>
        <tbody>
          {RowAmount(
            t("contract_total_bank_financing"),
            grossBank,
                "bank_total",
                null,
                true
          )}
          {RowAmount(
            t("contract_consultant_percentage"),
            0,
            "bank_fee",
                bankPct || totalPct || 0,
                false,
                true
          )}
          {RowAmount(
            t("contract_consultant_fees_bank"),
            bank.fee,
            "bank_fee"
          )}
          {RowAmount(
            t("contract_contractor_from_bank"),
            bank.net,
                "bank_net",
                null,
                true
          )}
        </tbody>
      </table>
        </div>
      )}

      {/* ③ مالك */}
        <div style={S.tableWrapper}>
          <div style={S.sectionTitle}>
        {t("contract_owner_share_title")}
      </div>
      <table style={{ ...S.table, flex: 1 }}>
        <thead>
          <tr>
                <th style={{ ...S.th, width: "60%" }}>{t("contract_description")}</th>
                <th style={{ ...S.th, width: "40%" }}>{t("contract_value_aed")}</th>
          </tr>
        </thead>
        <tbody>
          {RowAmount(
            t("contract_total_owner_financing"),
            grossOwner,
                "owner_total",
                null,
                true
          )}
              <tr style={S.emptyRow}>
                <td colSpan="2"></td>
              </tr>
          {RowAmount(
            t("contract_consultant_percentage"),
            0,
            "owner_fee",
                ownerPct || totalPct || 0,
                false,
                true
          )}
          {RowAmount(
            t("contract_consultant_fees_owner"),
            owner.fee,
            "owner_fee"
          )}
          {RowAmount(
            t("contract_contractor_from_owner"),
            owner.net,
                "owner_net",
                null,
                true
          )}
        </tbody>
      </table>
        </div>
      </div>

      {/* التفاصيل المالية شامل الضريبة - في سطر منفصل */}
      <div style={S.fullWidthTable}>
        <div style={S.sectionTitle}>
        {t("contract_vat_title")}
      </div>
      <table style={S.table}>
        <thead>
          <tr>
            <th style={{ ...S.th, width: "40%" }}>{t("contract_description")}</th>
            <th style={{ ...S.th, width: "20%" }}>{t("contract_value_excl_vat")}</th>
            <th style={{ ...S.th, width: "20%" }}>{t("contract_vat_5")}</th>
            <th style={{ ...S.th, width: "20%" }}>{t("contract_total_incl_vat")}</th>
          </tr>
        </thead>
        <tbody>
          {/* ✅ إخفاء صفوف البنك عند تمويل المالك فقط */}
          {!isPrivateFunding && RowVAT(t("contract_total_bank_financing"), grossBank)}
          {RowVAT(t("contract_total_owner_financing"), grossOwner)}
          {RowVAT(t("contract_total_contract_amount"), grossTotal, true)}
          {!isPrivateFunding && RowVAT(t("contract_consultant_fees_bank"), bank.fee)}
          {RowVAT(t("contract_consultant_fees_owner"), owner.fee)}
          {RowVAT(t("contract_total_consultant_fees"), total.fee, true)}
          {!isPrivateFunding && RowVAT(t("contract_contractor_from_bank"), bank.net)}
          {RowVAT(t("contract_contractor_from_owner"), owner.net)}
          {RowVAT(t("contract_total_actual_contractor"), total.net, true)}
        </tbody>
      </table>
      </div>
    </div>
  );
}
