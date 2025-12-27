import { useEffect, useMemo, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { api } from "../../../../services/api";
import InfoTip from "./InfoTip";
import { formatMoney } from "../../../../utils/formatters";
import { n, round, feeInclusive } from "../../../../utils/contractFinancial";

/* =================== Main =================== */
export default function ContractFinancialSummary({ projectId }) {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const isAR = /^ar\b/i.test(i18n.language || "");
  const [contract, setContract] = useState(null);
  const [variations, setVariations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // دالة تحميل البيانات
  const loadData = useCallback(async () => {
    if (!projectId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    Promise.all([
      api.get(`projects/${projectId}/contract/`).catch(() => ({ data: null })),
      api.get(`projects/${projectId}/variations/`).catch(() => ({ data: [] }))
    ])
      .then(([contractRes, variationsRes]) => {
        const contractData = contractRes.data;
        if (Array.isArray(contractData) && contractData.length) setContract(contractData[0]);
        else if (contractData && typeof contractData === "object") setContract(contractData);
        else setContract(null);
        
        const variationsData = variationsRes.data;
        if (Array.isArray(variationsData)) {
          setVariations(variationsData);
        } else if (variationsData && Array.isArray(variationsData.results)) {
          setVariations(variationsData.results);
        } else {
          setVariations([]);
        }
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

  // تحميل العقد والـ Variations عند التحميل الأولي وعند تغيير الموقع (فتح الصفحة)
  useEffect(() => {
    loadData();
  }, [loadData, location.pathname]);

  // ✅ الاستماع لحدث contract-updated لإعادة تحميل البيانات عند تحديث العقد
  useEffect(() => {
    if (!projectId) return;
    
    const handleContractUpdate = (event) => {
      if (event.detail?.projectId === projectId) {
        loadData();
      }
    };

    window.addEventListener("contract-updated", handleContractUpdate);

    return () => {
      window.removeEventListener("contract-updated", handleContractUpdate);
    };
  }, [projectId, loadData]);

  // كل الحسابات تتم هنا بشكل آمن
  const computed = useMemo(() => {
    try {
      if (!contract) return { error: null, data: null };

      const c = contract;
      
      // ✅ حساب إجمالي Variations (net_amount_with_vat)
      const totalVariationsAmount = variations.reduce((sum, v) => {
        return sum + (parseFloat(v.net_amount_with_vat) || 0);
      }, 0);

      // إجماليات
      const grossTotal = n(c.total_project_value);
      const grossBank =
        c.contract_classification === "housing_loan_program" ? n(c.total_bank_value) : 0;
      
      // ✅ حساب حصة المالك: للقرض السكني = الفرق، للتمويل الخاص = الإجمالي
      const calculatedOwner = c.contract_classification === "housing_loan_program" 
        ? Math.max(0, grossTotal - grossBank)  // ✅ للقرض السكني: الفرق
        : grossTotal;  // ✅ للتمويل الخاص: الإجمالي كامل
      
      // ✅ استخدام القيمة المحفوظة إذا كانت صحيحة (تساوي القيمة المحسوبة)، وإلا استخدام القيمة المحسوبة
      const savedOwner = n(c.total_owner_value);
      const grossOwner = (Math.abs(savedOwner - calculatedOwner) < 0.01) ? savedOwner : calculatedOwner;

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

      // ✅ حساب totalPct للإجمالي فقط (للعرض في الجدول الكلي)
      // إذا كانت النسب متساوية، نستخدمها، وإلا نستخدم المتوسط المرجح
      let totalPct = 0;
      if (ownerPct > 0 && bankPct > 0 && Math.abs(ownerPct - bankPct) < 1e-6) {
        // النسب متساوية
        totalPct = ownerPct;
      } else if (ownerPct > 0 && bankPct > 0) {
        // النسب مختلفة - نحسب المتوسط المرجح بناءً على المبالغ
        const totalFees = (grossOwner * ownerPct / (100 + ownerPct)) + (grossBank * bankPct / (100 + bankPct));
        const totalNet = grossTotal - totalFees;
        if (totalNet > 0) {
          totalPct = (totalFees / totalNet) * 100;
        }
      } else {
        // واحد فقط له نسبة
        totalPct = ownerPct || bankPct || 0;
      }

      // ✅ تفكيك الأتعاب من الإجماليات - كل جزء يستخدم نسبته الخاصة فقط
      const total = feeInclusive(grossTotal, totalPct);
      const bank = feeInclusive(grossBank, bankPct); // ✅ استخدام bankPct مباشرة فقط
      const owner = feeInclusive(grossOwner, ownerPct); // ✅ استخدام ownerPct مباشرة فقط

      // ✅ حساب الأتعاب الإضافية بالضريبة (5%)
      // للمالك
      let ownerExtraFee = 0;
      let ownerExtraFeeWithVat = 0;
      if (ownerIncludes && c.owner_fee_extra_value && n(c.owner_fee_extra_value) > 0) {
        if (c.owner_fee_extra_mode === "percent") {
          // إذا كانت نسبة: تُحسب من المبلغ بعد خصم الأتعاب الأساسية
          ownerExtraFee = round(owner.net * (n(c.owner_fee_extra_value) / 100));
        } else {
          // إذا كانت مبلغ ثابت: تُستخدم القيمة مباشرة
          ownerExtraFee = n(c.owner_fee_extra_value);
        }
        // إضافة الضريبة 5%
        ownerExtraFeeWithVat = round(ownerExtraFee * 1.05);
      }

      // للبنك
      let bankExtraFee = 0;
      let bankExtraFeeWithVat = 0;
      if (bankIncludes && c.bank_fee_extra_value && n(c.bank_fee_extra_value) > 0) {
        if (c.bank_fee_extra_mode === "percent") {
          // إذا كانت نسبة: تُحسب من المبلغ بعد خصم الأتعاب الأساسية
          bankExtraFee = round(bank.net * (n(c.bank_fee_extra_value) / 100));
        } else {
          // إذا كانت مبلغ ثابت: تُستخدم القيمة مباشرة
          bankExtraFee = n(c.bank_fee_extra_value);
        }
        // إضافة الضريبة 5%
        bankExtraFeeWithVat = round(bankExtraFee * 1.05);
      }

      // ✅ خصم الأتعاب الإضافية من المبلغ النهائي (بالضريبة)
      const ownerFinal = {
        fee: owner.fee,
        net: owner.net - ownerExtraFeeWithVat, // ✅ خصم الأتعاب الإضافية بالضريبة
        extraFee: ownerExtraFee,
        extraFeeWithVat: ownerExtraFeeWithVat,
        extraDescription: c.owner_fee_extra_description || ""
      };

      const bankFinal = {
        fee: bank.fee,
        net: bank.net - bankExtraFeeWithVat, // ✅ خصم الأتعاب الإضافية بالضريبة
        extraFee: bankExtraFee,
        extraFeeWithVat: bankExtraFeeWithVat,
        extraDescription: c.bank_fee_extra_description || ""
      };

      const totalExtraFee = ownerExtraFee + bankExtraFee;
      const totalExtraFeeWithVat = ownerExtraFeeWithVat + bankExtraFeeWithVat;
      // ✅ إجمالي أتعاب الاستشاري = مجموع أتعاب البنك + أتعاب المالك (وليس من totalPct)
      const totalConsultantFee = bank.fee + owner.fee;
      const totalFinal = {
        fee: totalConsultantFee, // ✅ استخدام مجموع أتعاب البنك والمالك مباشرة
        net: total.net - totalExtraFeeWithVat, // ✅ خصم الأتعاب الإضافية بالضريبة
        extraFee: totalExtraFee,
        extraFeeWithVat: totalExtraFeeWithVat
      };

      // ✅ إضافة Variations إلى مبلغ المقاولة الفعلية
      // totalFinal.net = مبلغ المقاولة الفعلية من العقد (بعد خصم الأتعاب الإضافية)
      // totalVariationsAmount = إجمالي Variations
      // actualContractorAmount = المبلغ الفعلي للمقاول (العقد + Variations)
      const actualContractorAmount = totalFinal.net + totalVariationsAmount;

      // حساب المبلغ المستحق للمقاول (Payable Amount to Contractor)
      // المالك يدفع المبلغ الكامل (شامل أتعاب الاستشاري)، البنك يدفع المبلغ بعد خصم أتعاب الاستشاري
      // Payable Amount = grossOwner (full) + bankFinal.net (after fees and extra fees) = grossTotal - bank.fee - bankExtraFeeWithVat
      // ✅ إضافة Variations إلى payableAmount أيضاً
      const payableAmount = (grossOwner + bankFinal.net) + totalVariationsAmount;

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
          total: totalFinal,
          bank: bankFinal,
          owner: ownerFinal,
          payableAmount,
          totalVariationsAmount,
          actualContractorAmount,
          A,
          vat,
          inc,
        },
      };
    } catch (e) {
      return { error: e, data: null };
    }
  }, [contract, variations]);

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
  const { grossTotal, grossBank, grossOwner, ownerPct, bankPct, totalPct, total, bank, owner, payableAmount, totalVariationsAmount, actualContractorAmount, A, vat, inc } = computed.data;
  
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
                t("contract_total_actual_contractor") || "مبلغ المقاولة الفعلية (من العقد)",
                total.net,
                "actual_contract_vat",
                null,
                false
              )}
              {totalVariationsAmount !== 0 && RowAmount(
                t("variations_title") || "أوامر التغيير السعري",
                totalVariationsAmount,
                "actual_contract_vat",
                null,
                false
              )}
              {RowAmount(
                t("contract_total_actual_contractor_with_variations") || "المبلغ الفعلي الإجمالي (العقد + التعديلات)",
                actualContractorAmount,
                "actual_contract_vat",
                null,
                false,
                true
              )}
              {RowAmount(
                t("contract_vat_5"),
                vat(actualContractorAmount),
                "actual_contract_vat"
              )}
              {RowAmount(
                t("contract_total_incl_vat"),
                inc(actualContractorAmount),
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
                total.fee > 0 ? totalPct : 0, // ✅ عرض 0% إذا كانت الأتعاب صفر
                false,
                true
          )}
          {RowAmount(
            t("contract_total_consultant_fees"),
            total.fee,
            "fee_total"
          )}
          {/* ✅ عرض الأتعاب الإضافية للإجمالي إذا كانت موجودة */}
          {total.extraFeeWithVat > 0 && (
            <>
              {RowAmount(
                t("contract_extra_fees") || "الأتعاب الإضافية",
                total.extraFeeWithVat,
                "total_extra_fee"
              )}
            </>
          )}
          {RowAmount(
            t("contract_total_actual_contractor") || "مبلغ المقاولة الفعلية (من العقد)",
            total.net,
                "net_total",
                null,
                false
          )}
          {totalVariationsAmount !== 0 && RowAmount(
            t("variations_title") || "أوامر التغيير السعري",
            totalVariationsAmount,
            "net_total",
            null,
            false
          )}
          {RowAmount(
            t("contract_total_actual_contractor_with_variations") || "المبلغ الفعلي الإجمالي (العقد + التعديلات)",
            actualContractorAmount,
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
                 bank.fee > 0 ? bankPct : 0, // ✅ عرض 0% إذا كانت الأتعاب صفر
                false,
                true
          )}
          {RowAmount(
            t("contract_consultant_fees_bank"),
            bank.fee,
            "bank_fee"
          )}
           {/* ✅ عرض الأتعاب الإضافية للبنك إذا كانت موجودة */}
           {bank.extraFeeWithVat > 0 && (
             <>
               {RowAmount(
                 bank.extraDescription || t("contract_extra_fees") || "الأتعاب الإضافية",
                 bank.extraFeeWithVat,
                 "bank_extra_fee"
               )}
             </>
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
                owner.fee > 0 ? ownerPct : 0, // ✅ عرض 0% إذا كانت الأتعاب صفر
                false,
                true
          )}
          {RowAmount(
            t("contract_consultant_fees_owner"),
            owner.fee,
            "owner_fee"
          )}
          {/* ✅ عرض الأتعاب الإضافية للمالك إذا كانت موجودة */}
          {owner.extraFeeWithVat > 0 && (
            <>
              {RowAmount(
                owner.extraDescription || t("contract_extra_fees") || "الأتعاب الإضافية",
                owner.extraFeeWithVat,
                "owner_extra_fee"
              )}
            </>
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
          {/* ✅ عرض الأتعاب الإضافية في الجدول الكبير - نمرر المبلغ الأصلي (غير شامل الضريبة) لأن RowVAT تضيف الضريبة تلقائياً */}
          {!isPrivateFunding && bank.extraFee > 0 && RowVAT(bank.extraDescription || t("contract_extra_fees") || "الأتعاب الإضافية (البنك)", bank.extraFee)}
          {owner.extraFee > 0 && RowVAT(owner.extraDescription || t("contract_extra_fees") || "الأتعاب الإضافية (المالك)", owner.extraFee)}
          {total.extraFee > 0 && RowVAT(t("contract_total_extra_fees") || "إجمالي الأتعاب الإضافية", total.extraFee, true)}
          {!isPrivateFunding && RowVAT(t("contract_contractor_from_bank"), bank.net)}
          {RowVAT(t("contract_contractor_from_owner"), owner.net)}
          {RowVAT(t("contract_total_actual_contractor") || "مبلغ المقاولة الفعلية (من العقد)", total.net, false)}
          {totalVariationsAmount !== 0 && RowVAT(t("variations_title") || "أوامر التغيير السعري", totalVariationsAmount, false)}
          {RowVAT(t("contract_total_actual_contractor_with_variations") || "المبلغ الفعلي الإجمالي (العقد + التعديلات)", actualContractorAmount, true)}
        </tbody>
      </table>
      </div>
    </div>
  );
}
