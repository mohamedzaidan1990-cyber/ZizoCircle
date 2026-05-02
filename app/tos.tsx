import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const EN = {
  title: 'Terms of Service',
  subtitle: 'Zizo Circle — Bayline Holding W.L.L.',
  lastUpdated: 'Last updated: April 2026',
  acceptBtn: 'I Accept the Terms of Service',
  declineBtn: 'Decline',
  sections: [
    {
      heading: '1. Acceptance of Terms',
      body: `By creating an account or using the Zizo Circle application ("App"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree, you must not use the App. These Terms constitute a legally binding agreement between you and Bayline Holding W.L.L., a company registered in the State of Qatar ("Company", "we", "us").`,
    },
    {
      heading: '2. Eligibility',
      body: `You must be at least 18 years of age to use Zizo Circle. By using the App, you represent and warrant that you are 18 years of age or older. The Company reserves the right to terminate any account found to belong to a person under 18 years of age without notice.`,
    },
    {
      heading: '3. Purpose of the App',
      body: `Zizo Circle is a social interest-based matching platform designed to connect people who share common interests and help them discover partner venues offering cashback rewards. The App is strictly NOT a dating application and must not be used for romantic solicitation, sexual services, or any activity of an intimate or adult nature. Violation of this clause will result in immediate and permanent account termination.`,
    },
    {
      heading: '4. Prohibited Conduct',
      body: `You agree not to use the App to:\n\n• Solicit, offer, or arrange sexual services or prostitution of any kind\n• Engage in harassment, abuse, threats, or intimidation of other users\n• Share explicit, adult, or sexually suggestive content\n• Impersonate another person or create a false identity\n• Promote illegal activities, substances, or services\n• Use the App for commercial solicitation without prior written consent\n• Attempt to extract personal data from other users\n• Engage in any activity that violates the laws of the State of Qatar\n\nThe Company actively monitors user activity and reserves the right to report illegal conduct to the relevant Qatari authorities, including but not limited to the Ministry of Interior.`,
    },
    {
      heading: '5. User Alias & Identity',
      body: `Upon registration, you will select a permanent alias that cannot be changed. Your full name is only disclosed to matches you explicitly approve. You are responsible for maintaining the confidentiality of your account credentials. You must not share your account with any other person.`,
    },
    {
      heading: '6. Personal Data & Privacy',
      body: `We collect the following personal data: full name, alias, email address, age group, gender, location, and selected interests. This data is collected and processed in accordance with Qatar's Personal Data Protection Law (Law No. 13 of 2016) ("PDPL").\n\nYour personal data will be used to:\n• Power the AI-based interest matching engine\n• Display your profile to compatible users nearby\n• Process cashback transactions\n• Send relevant in-app notifications\n• Improve app performance and features\n\nWe will NEVER sell your personal data to third parties. Anonymized and aggregated data (never personally identifiable) may be used for internal analytics and to improve our services. We may use your general interests and location data to serve relevant venue recommendations and marketing within the App.`,
    },
    {
      heading: '7. Data Retention & Deletion',
      body: `Your data is stored securely on Google Firebase servers. You may request deletion of your account and all associated personal data at any time by contacting us at privacy@zizocircle.com. Upon deletion, your data will be permanently removed within 30 days, except where retention is required by Qatari law.`,
    },
    {
      heading: '8. Cashback & Wallet',
      body: `Cashback rewards are earned through verified visits to partner venues. The Company reserves the right to modify cashback rates, add or remove partner venues, and adjust wallet features at any time. Wallet balances have no cash equivalent and cannot be withdrawn as cash unless specifically enabled by the Company. The Company reserves the right to void cashback earned through fraudulent means.`,
    },
    {
      heading: '9. Content Moderation',
      body: `The Company employs automated and manual moderation of in-app communications. Messages containing keywords associated with illegal services, solicitation, or harmful conduct will be flagged for review. Confirmed violations will result in immediate account suspension and, where appropriate, reporting to Qatari law enforcement authorities.`,
    },
    {
      heading: '10. Intellectual Property',
      body: `All content, design, logos, trademarks, and technology within the App are the exclusive property of Bayline Holding W.L.L. You may not copy, reproduce, distribute, or create derivative works without express written permission from the Company.`,
    },
    {
      heading: '11. Limitation of Liability',
      body: `The App is provided "as is" without warranties of any kind. The Company shall not be liable for any indirect, incidental, or consequential damages arising from your use of the App. The Company is not responsible for the conduct of other users on the platform.`,
    },
    {
      heading: '12. Termination',
      body: `The Company reserves the right to suspend or permanently terminate your account at any time, with or without notice, for violation of these Terms or for any conduct deemed harmful to the community or the Company. You may also delete your account at any time from the Profile settings.`,
    },
    {
      heading: '13. Governing Law',
      body: `These Terms are governed by and construed in accordance with the laws of the State of Qatar. Any disputes arising from these Terms shall be subject to the exclusive jurisdiction of the courts of Qatar.`,
    },
    {
      heading: '14. Contact',
      body: `For any questions regarding these Terms or your data, contact us at:\n\nBayline Holding W.L.L.\nEmail: legal@zizocircle.com\nPrivacy: privacy@zizocircle.com\nDoha, State of Qatar`,
    },
  ],
};

const AR = {
  title: 'شروط الخدمة',
  subtitle: 'زيزو سيركل — بايلاين هولدينج ش.م.م.',
  lastUpdated: 'آخر تحديث: أبريل 2026',
  acceptBtn: 'أوافق على شروط الخدمة',
  declineBtn: 'رفض',
  sections: [
    {
      heading: '١. قبول الشروط',
      body: `بإنشاء حساب أو استخدام تطبيق زيزو سيركل ("التطبيق")، فإنك توافق على الالتزام بشروط الخدمة هذه ("الشروط"). إذا كنت لا توافق، فيجب عليك عدم استخدام التطبيق. تُشكّل هذه الشروط اتفاقية ملزمة قانونياً بينك وبين بايلاين هولدينج ش.م.م.، وهي شركة مسجلة في دولة قطر ("الشركة").`,
    },
    {
      heading: '٢. الأهلية',
      body: `يجب أن يكون عمرك 18 عاماً على الأقل لاستخدام زيزو سيركل. باستخدام التطبيق، فأنت تُقرّ وتضمن أنك بالغ من العمر 18 عاماً أو أكثر. تحتفظ الشركة بالحق في إنهاء أي حساب يُثبت أنه يعود لشخص دون سن 18 عاماً دون إشعار مسبق.`,
    },
    {
      heading: '٣. الغرض من التطبيق',
      body: `زيزو سيركل هو منصة اجتماعية قائمة على الاهتمامات المشتركة، مصممة لربط الأشخاص الذين يتشاركون اهتمامات متماثلة ومساعدتهم على اكتشاف الأماكن الشريكة التي تقدم مكافآت استرداد النقود. التطبيق ليس تطبيق مواعدة ولا يُسمح باستخدامه للتواصل العاطفي أو الخدمات الجنسية أو أي نشاط ذي طابع بالغ. مخالفة هذا البند تُؤدي إلى إنهاء الحساب فوراً ونهائياً.`,
    },
    {
      heading: '٤. السلوك المحظور',
      body: `توافق على عدم استخدام التطبيق من أجل:\n\n• عرض أو طلب أو ترتيب خدمات جنسية أو الدعارة بأي شكل\n• التحرش أو الإساءة أو التهديد أو التخويف لمستخدمين آخرين\n• مشاركة محتوى صريح أو للبالغين أو ذو طابع جنسي\n• انتحال شخصية شخص آخر أو إنشاء هوية مزيفة\n• الترويج للأنشطة أو المواد أو الخدمات غير المشروعة\n• الاستخدام التجاري دون إذن كتابي مسبق\n• محاولة استخراج البيانات الشخصية لمستخدمين آخرين\n• أي نشاط يخالف قوانين دولة قطر\n\nتراقب الشركة نشاط المستخدمين وتحتفظ بالحق في الإبلاغ عن أي سلوك غير قانوني للجهات المختصة في قطر.`,
    },
    {
      heading: '٥. الاسم المستعار والهوية',
      body: `عند التسجيل، ستختار اسماً مستعاراً دائماً لا يمكن تغييره. لن يُكشف عن اسمك الكامل إلا للمطابقات التي توافق عليها صراحةً. أنت مسؤول عن الحفاظ على سرية بيانات حسابك ولا يحق لك مشاركة حسابك مع أي شخص آخر.`,
    },
    {
      heading: '٦. البيانات الشخصية والخصوصية',
      body: `نجمع البيانات الشخصية التالية: الاسم الكامل، الاسم المستعار، البريد الإلكتروني، الفئة العمرية، الجنس، الموقع، والاهتمامات المختارة. تُجمع هذه البيانات وتُعالج وفقاً لقانون حماية البيانات الشخصية في قطر (قانون رقم 13 لسنة 2016).\n\nستُستخدم بياناتك الشخصية لـ:\n• تشغيل محرك المطابقة بالذكاء الاصطناعي\n• عرض ملفك الشخصي للمستخدمين المتوافقين\n• معالجة معاملات استرداد النقود\n• إرسال إشعارات ذات صلة داخل التطبيق\n• تحسين أداء التطبيق وميزاته\n\nلن نبيع بياناتك الشخصية أبداً لأطراف ثالثة. قد تُستخدم البيانات المجهولة الهوية والمجمّعة (غير القابلة للتعريف الشخصي) للتحليلات الداخلية وتحسين خدماتنا.`,
    },
    {
      heading: '٧. الاحتفاظ بالبيانات وحذفها',
      body: `تُخزَّن بياناتك بأمان على خوادم Google Firebase. يمكنك طلب حذف حسابك وجميع بياناتك الشخصية المرتبطة به في أي وقت عن طريق التواصل معنا على privacy@zizocircle.com. عند الحذف، ستُزال بياناتك بشكل دائم خلال 30 يوماً، إلا إذا كان الاحتفاظ بها مطلوباً بموجب القانون القطري.`,
    },
    {
      heading: '٨. استرداد النقود والمحفظة',
      body: `تُكتسب مكافآت استرداد النقود من خلال الزيارات الموثقة للأماكن الشريكة. تحتفظ الشركة بالحق في تعديل معدلات الاسترداد وإضافة أو إزالة الأماكن الشريكة وتعديل ميزات المحفظة في أي وقت. أرصدة المحفظة ليس لها ما يعادلها نقداً ولا يمكن سحبها كنقد إلا إذا أتاحت الشركة ذلك صراحةً.`,
    },
    {
      heading: '٩. إشراف المحتوى',
      body: `تعتمد الشركة إشرافاً آلياً ويدوياً على الاتصالات داخل التطبيق. ستُبلَّغ الرسائل التي تحتوي على كلمات مفتاحية مرتبطة بالخدمات غير المشروعة أو الإيذاء للمراجعة. ستُؤدي الانتهاكات المؤكدة إلى تعليق الحساب فوراً وإبلاغ الجهات الأمنية القطرية عند الاقتضاء.`,
    },
    {
      heading: '١٠. الملكية الفكرية',
      body: `جميع المحتويات والتصاميم والشعارات والعلامات التجارية والتقنيات داخل التطبيق هي الملكية الحصرية لبايلاين هولدينج ش.م.م. لا يجوز نسخها أو إعادة توزيعها أو إنشاء أعمال مشتقة منها دون إذن كتابي صريح.`,
    },
    {
      heading: '١١. تحديد المسؤولية',
      body: `يُقدَّم التطبيق "كما هو" دون أي ضمانات. لن تكون الشركة مسؤولة عن أي أضرار غير مباشرة أو عرضية أو تبعية ناجمة عن استخدامك للتطبيق. الشركة غير مسؤولة عن تصرفات المستخدمين الآخرين على المنصة.`,
    },
    {
      heading: '١٢. الإنهاء',
      body: `تحتفظ الشركة بالحق في تعليق أو إنهاء حسابك في أي وقت، مع أو بدون إشعار، في حال انتهاك هذه الشروط أو أي سلوك يُعتبر ضاراً بالمجتمع أو الشركة. يمكنك أيضاً حذف حسابك في أي وقت من إعدادات الملف الشخصي.`,
    },
    {
      heading: '١٣. القانون الحاكم',
      body: `تخضع هذه الشروط وتُفسَّر وفقاً لقوانين دولة قطر. تخضع أي نزاعات ناشئة عن هذه الشروط للاختصاص القضائي الحصري لمحاكم دولة قطر.`,
    },
    {
      heading: '١٤. التواصل',
      body: `لأي استفسارات بشأن هذه الشروط أو بياناتك، تواصل معنا على:\n\nبايلاين هولدينج ش.م.م.\nالبريد الإلكتروني: legal@zizocircle.com\nالخصوصية: privacy@zizocircle.com\nالدوحة، دولة قطر`,
    },
  ],
};

export default function TermsScreen({ onAccept, onDecline, showActions: showActionsProp = true }: {
  onAccept?: () => void;
  onDecline?: () => void;
  showActions?: boolean;
}) {
  const router = useRouter();
  const params = useLocalSearchParams<{ showActions?: string; from?: string }>();
  const showActions = params.showActions !== undefined ? params.showActions !== 'false' : showActionsProp;
  const isOnboarding = params.from === 'onboarding';
  const [lang, setLang] = useState<'en' | 'ar'>('en');
  const t = lang === 'en' ? EN : AR;
  const isAr = lang === 'ar';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {!showActions && (
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
        )}
        <View style={styles.headerCenter}>
          <Text style={[styles.title, isAr && styles.rtl]}>{t.title}</Text>
          <Text style={[styles.subtitle, isAr && styles.rtl]}>{t.subtitle}</Text>
        </View>
        <View style={styles.langToggle}>
          <TouchableOpacity
            style={[styles.langBtn, lang === 'en' && styles.langBtnOn]}
            onPress={() => setLang('en')}
          >
            <Text style={[styles.langBtnText, lang === 'en' && styles.langBtnTextOn]}>EN</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.langBtn, lang === 'ar' && styles.langBtnOn]}
            onPress={() => setLang('ar')}
          >
            <Text style={[styles.langBtnText, lang === 'ar' && styles.langBtnTextOn]}>AR</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={[styles.lastUpdated, isAr && styles.rtl]}>{t.lastUpdated}</Text>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.warningBanner}>
          <Text style={styles.warningIcon}>⚠️</Text>
          <Text style={[styles.warningText, isAr && styles.rtl]}>
            {isAr
              ? 'زيزو سيركل ليس تطبيق مواعدة. أي محاولة لاستخدامه لأغراض غير لائقة ستؤدي إلى إنهاء الحساب والإبلاغ للسلطات.'
              : 'Zizo Circle is NOT a dating app. Any attempt to use it for illicit purposes will result in account termination and reporting to authorities.'}
          </Text>
        </View>

        {t.sections.map((s, i) => (
          <View key={i} style={styles.section}>
            <Text style={[styles.sectionHeading, isAr && styles.rtl]}>{s.heading}</Text>
            <Text style={[styles.sectionBody, isAr && styles.rtl]}>{s.body}</Text>
          </View>
        ))}
        <View style={{ height: showActions ? 120 : 40 }} />
      </ScrollView>

      {showActions && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.acceptBtn}
            onPress={
              onAccept ||
              (() =>
                isOnboarding
                  ? router.replace('/profile-setup' as any)
                  : router.replace('/(tabs)' as any))
            }
            activeOpacity={0.85}
          >
            <Text style={styles.acceptBtnText}>{t.acceptBtn}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.declineBtn}
            onPress={onDecline || (() => router.back())}
          >
            <Text style={styles.declineBtnText}>{t.declineBtn}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0914' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 52, paddingBottom: 8, gap: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#181428', borderWidth: 1,
    borderColor: '#231E3A', alignItems: 'center', justifyContent: 'center',
  },
  backText: { fontSize: 18, color: '#7A7595' },
  headerCenter: { flex: 1 },
  title: { fontSize: 20, fontWeight: '800', color: '#F0EEF8' },
  subtitle: { fontSize: 11, color: '#7A7595', marginTop: 2 },
  langToggle: {
    flexDirection: 'row', backgroundColor: '#181428',
    borderRadius: 10, borderWidth: 1, borderColor: '#231E3A',
    overflow: 'hidden',
  },
  langBtn: { paddingHorizontal: 12, paddingVertical: 7 },
  langBtnOn: { backgroundColor: '#7B5CF6' },
  langBtnText: { fontSize: 12, fontWeight: '700', color: '#7A7595' },
  langBtnTextOn: { color: '#fff' },
  lastUpdated: { fontSize: 11, color: '#7A7595', paddingHorizontal: 20, marginBottom: 12 },
  scroll: { flex: 1, paddingHorizontal: 20 },
  warningBanner: {
    flexDirection: 'row', gap: 10,
    backgroundColor: 'rgba(245,59,143,0.08)',
    borderWidth: 1, borderColor: 'rgba(245,59,143,0.25)',
    borderRadius: 14, padding: 14, marginBottom: 20,
    alignItems: 'flex-start',
  },
  warningIcon: { fontSize: 18 },
  warningText: { flex: 1, fontSize: 13, color: '#F53B8F', lineHeight: 20, fontWeight: '600' },
  section: { marginBottom: 20 },
  sectionHeading: {
    fontSize: 14, fontWeight: '800',
    color: '#A78BFA', marginBottom: 8,
  },
  sectionBody: {
    fontSize: 13, color: '#B0ABBE',
    lineHeight: 22,
  },
  rtl: { textAlign: 'right', writingDirection: 'rtl' },
  actions: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 20, paddingBottom: 36,
    backgroundColor: 'rgba(11,9,20,0.97)',
    borderTopWidth: 1, borderTopColor: '#231E3A',
    gap: 10,
  },
  acceptBtn: {
    backgroundColor: '#7B5CF6',
    borderRadius: 16, padding: 16, alignItems: 'center',
  },
  acceptBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  declineBtn: {
    backgroundColor: '#181428', borderWidth: 1,
    borderColor: '#231E3A', borderRadius: 16,
    padding: 14, alignItems: 'center',
  },
  declineBtnText: { fontSize: 14, fontWeight: '600', color: '#7A7595' },
});
