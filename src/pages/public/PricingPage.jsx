import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';

export default function PricingPage() {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  const plans = [
    {
      name: isRTL ? 'باقة المستخدم' : 'User-Based Plan',
      nameEn: 'User-Based',
      price: '150',
      currency: 'AED',
      period: isRTL ? 'سنوياً لكل مستخدم' : 'per user per year',
      description: isRTL ? 'مناسبة للشركات الصغيرة' : 'Perfect for small businesses',
      features: [
        isRTL ? 'لا حدود للمشاريع' : 'Unlimited projects',
        isRTL ? 'إدارة كاملة للمشاريع' : 'Complete project management',
        isRTL ? 'نظام الموافقات' : 'Approval system',
        isRTL ? 'التقارير الأساسية' : 'Basic reports',
        isRTL ? 'دعم فني' : 'Technical support',
      ],
      popular: false,
    },
    {
      name: isRTL ? 'الباقة الأساسية' : 'Basic Plan',
      nameEn: 'Basic',
      price: '2,000',
      currency: 'AED',
      period: isRTL ? 'سنوياً' : 'per year',
      description: isRTL ? 'مناسبة للشركات المتوسطة' : 'Perfect for medium businesses',
      features: [
        isRTL ? '5 مستخدمين' : '5 users included',
        isRTL ? '15 مشروع' : '15 projects',
        isRTL ? 'إضافة مستخدم إضافي: 150 درهم' : 'Additional user: 150 AED',
        isRTL ? 'إدارة كاملة للمشاريع' : 'Complete project management',
        isRTL ? 'نظام الموافقات المتقدم' : 'Advanced approval system',
        isRTL ? 'التقارير الشاملة' : 'Comprehensive reports',
        isRTL ? 'دعم فني متميز' : 'Premium technical support',
      ],
      popular: true,
    },
    {
      name: isRTL ? 'باقة الشركات المتوسطة' : 'Medium Business Plan',
      nameEn: 'Medium Business',
      price: isRTL ? 'قريباً' : 'Coming Soon',
      currency: '',
      period: '',
      description: isRTL ? 'سيتم الإعلان عنها قريباً' : 'Will be announced soon',
      features: [
        isRTL ? 'ميزات إضافية' : 'Additional features',
        isRTL ? 'مستخدمين أكثر' : 'More users',
        isRTL ? 'مشاريع غير محدودة' : 'Unlimited projects',
      ],
      popular: false,
      comingSoon: true,
    },
    {
      name: isRTL ? 'باقة الشركات الكبيرة' : 'Enterprise Plan',
      nameEn: 'Enterprise',
      price: isRTL ? 'قريباً' : 'Coming Soon',
      currency: '',
      period: '',
      description: isRTL ? 'سيتم الإعلان عنها قريباً' : 'Will be announced soon',
      features: [
        isRTL ? 'ميزات متقدمة' : 'Advanced features',
        isRTL ? 'مستخدمين غير محدود' : 'Unlimited users',
        isRTL ? 'دعم مخصص' : 'Custom support',
      ],
      popular: false,
      comingSoon: true,
    },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      {/* Header */}
      <header
        style={{
          background: 'var(--color-surface)',
          borderBottom: '1px solid var(--color-border)',
          padding: 'var(--space-4) var(--space-6)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-primary)' }}>
          {isRTL ? 'نظام إدارة المشاريع' : 'Project Management System'}
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <Button variant="secondary" onClick={() => navigate('/landing')}>
            {isRTL ? 'الرئيسية' : 'Home'}
          </Button>
          <Button variant="secondary" onClick={() => navigate('/login')}>
            {isRTL ? 'تسجيل الدخول' : 'Sign In'}
          </Button>
          <Button variant="primary" onClick={() => navigate('/register-company')}>
            {isRTL ? 'إنشاء حساب' : 'Sign Up'}
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section
        style={{
          padding: 'var(--space-12) var(--space-6)',
          textAlign: 'center',
          maxWidth: '1200px',
          margin: '0 auto',
        }}
      >
        <h1
          style={{
            fontSize: 'var(--font-size-4xl)',
            fontWeight: 'var(--font-weight-bold)',
            color: 'var(--color-text-primary)',
            marginBottom: 'var(--space-4)',
          }}
        >
          {isRTL ? 'الباقات والتسعير' : 'Pricing Plans'}
        </h1>
        <p
          style={{
            fontSize: 'var(--font-size-xl)',
            color: 'var(--color-text-secondary)',
            marginBottom: 'var(--space-8)',
            maxWidth: '800px',
            margin: '0 auto var(--space-8)',
          }}
        >
          {isRTL
            ? 'اختر الباقة المناسبة لشركتك وابدأ إدارة مشاريعك بكفاءة'
            : 'Choose the plan that suits your company and start managing your projects efficiently'}
        </p>
      </section>

      {/* Pricing Cards */}
      <section
        style={{
          padding: 'var(--space-8) var(--space-6)',
          maxWidth: '1400px',
          margin: '0 auto',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 'var(--space-6)',
          }}
        >
          {plans.map((plan, index) => (
            <Card
              key={index}
              style={{
                position: 'relative',
                border: plan.popular ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                transform: plan.popular ? 'scale(1.05)' : 'scale(1)',
                transition: 'transform var(--transition-base)',
              }}
            >
              {plan.popular && (
                <div
                  style={{
                    position: 'absolute',
                    top: '-12px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'var(--color-primary)',
                    color: 'white',
                    padding: 'var(--space-1) var(--space-4)',
                    borderRadius: 'var(--radius-full)',
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: 'var(--font-weight-semibold)',
                  }}
                >
                  {isRTL ? 'الأكثر شعبية' : 'Most Popular'}
                </div>
              )}
              {plan.comingSoon && (
                <div
                  style={{
                    position: 'absolute',
                    top: '-12px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'var(--gray-500)',
                    color: 'white',
                    padding: 'var(--space-1) var(--space-4)',
                    borderRadius: 'var(--radius-full)',
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: 'var(--font-weight-semibold)',
                  }}
                >
                  {isRTL ? 'قريباً' : 'Coming Soon'}
                </div>
              )}
              <h3
                style={{
                  fontSize: 'var(--font-size-2xl)',
                  fontWeight: 'var(--font-weight-bold)',
                  marginBottom: 'var(--space-2)',
                  color: 'var(--color-text-primary)',
                }}
              >
                {plan.name}
              </h3>
              <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)', fontSize: 'var(--font-size-sm)' }}>
                {plan.description}
              </p>
              <div style={{ marginBottom: 'var(--space-6)' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-2)' }}>
                  <span
                    style={{
                      fontSize: 'var(--font-size-4xl)',
                      fontWeight: 'var(--font-weight-bold)',
                      color: 'var(--color-primary)',
                    }}
                  >
                    {plan.price}
                  </span>
                  {plan.currency && (
                    <span style={{ fontSize: 'var(--font-size-lg)', color: 'var(--color-text-secondary)' }}>
                      {plan.currency}
                    </span>
                  )}
                </div>
                {plan.period && (
                  <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', marginTop: 'var(--space-1)' }}>
                    {plan.period}
                  </p>
                )}
              </div>
              <ul
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: '0 0 var(--space-6) 0',
                  textAlign: isRTL ? 'right' : 'left',
                }}
              >
                {plan.features.map((feature, idx) => (
                  <li
                    key={idx}
                    style={{
                      padding: 'var(--space-2) 0',
                      color: 'var(--color-text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-2)',
                    }}
                  >
                    <span style={{ color: 'var(--color-primary)', fontSize: 'var(--font-size-lg)' }}>✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <Button
                variant={plan.popular ? 'primary' : 'secondary'}
                fullWidth
                onClick={() => navigate('/register-company')}
                disabled={plan.comingSoon}
              >
                {plan.comingSoon
                  ? isRTL
                    ? 'قريباً'
                    : 'Coming Soon'
                  : isRTL
                  ? 'اختر هذه الباقة'
                  : 'Choose Plan'}
              </Button>
            </Card>
          ))}
        </div>
      </section>

      {/* FAQ Section */}
      <section style={{ padding: 'var(--space-12) var(--space-6)', background: 'var(--color-surface)' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2
            style={{
              fontSize: 'var(--font-size-3xl)',
              fontWeight: 'var(--font-weight-semibold)',
              textAlign: 'center',
              marginBottom: 'var(--space-8)',
              color: 'var(--color-text-primary)',
            }}
          >
            {isRTL ? 'الأسئلة الشائعة' : 'Frequently Asked Questions'}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {[
              {
                q: isRTL ? 'هل يمكنني تغيير الباقة لاحقاً؟' : 'Can I change my plan later?',
                a: isRTL
                  ? 'نعم، يمكنك ترقية أو تخفيض باقاتك في أي وقت من إعدادات الشركة.'
                  : 'Yes, you can upgrade or downgrade your plan at any time from company settings.',
              },
              {
                q: isRTL ? 'هل يوجد فترة تجريبية؟' : 'Is there a trial period?',
                a: isRTL
                  ? 'نعم، جميع الباقات الجديدة تبدأ بفترة تجريبية مجانية.'
                  : 'Yes, all new plans start with a free trial period.',
              },
              {
                q: isRTL ? 'كيف أضيف مستخدمين إضافيين؟' : 'How do I add additional users?',
                a: isRTL
                  ? 'يمكنك إضافة مستخدمين إضافيين من لوحة التحكم، وستتم محاسبتك حسب الباقة المختارة.'
                  : 'You can add additional users from the dashboard, and you will be billed according to your chosen plan.',
              },
            ].map((faq, idx) => (
              <Card key={idx}>
                <h4 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-2)' }}>
                  {faq.q}
                </h4>
                <p style={{ color: 'var(--color-text-secondary)', lineHeight: 'var(--line-height-relaxed)' }}>{faq.a}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section
        style={{
          padding: 'var(--space-12) var(--space-6)',
          background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--primary-700) 100%)',
          color: 'white',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--space-4)' }}>
            {isRTL ? 'ابدأ الآن' : 'Get Started Now'}
          </h2>
          <p style={{ fontSize: 'var(--font-size-xl)', marginBottom: 'var(--space-6)', opacity: 0.9 }}>
            {isRTL
              ? 'سجل شركتك وابدأ إدارة مشاريعك بكفاءة'
              : 'Register your company and start managing your projects efficiently'}
          </p>
          <Button
            variant="secondary"
            size="lg"
            onClick={() => navigate('/register-company')}
            style={{ background: 'white', color: 'var(--color-primary)' }}
          >
            {isRTL ? 'إنشاء حساب مجاني' : 'Create Free Account'}
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          background: 'var(--color-surface)',
          borderTop: '1px solid var(--color-border)',
          padding: 'var(--space-6)',
          textAlign: 'center',
          color: 'var(--color-text-secondary)',
        }}
      >
        <p>
          {isRTL
            ? '© 2024 نظام إدارة المشاريع. جميع الحقوق محفوظة.'
            : '© 2024 Project Management System. All rights reserved.'}
        </p>
      </footer>
    </div>
  );
}


