import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, FileText } from 'lucide-react'

function MobileSection({ number, title, content }: { number: string; title: string; content: string }) {
  return (
    <div className="bg-white rounded-xl border border-cyan-200 p-3 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <div className="w-7 h-7 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
          <span className="text-white text-xs font-bold">{number}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 text-sm leading-snug">{title}</h3>
          <p className="text-xs text-gray-700 leading-relaxed mt-1">{content}</p>
        </div>
      </div>
    </div>
  )
}

export default function RefundPolicy() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Background */}
      <div className="bg-gradient-to-b from-orange-50 to-transparent pt-2 pb-4 mb-2"></div>

      <div className="px-3">
        {/* Back Button */}
        <Link to="/" className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-xs font-medium">Back</span>
        </Link>

        {/* Title Section */}
        <div className="bg-white rounded-xl p-3 mb-4 border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-bold text-gray-900 leading-tight">Refund Policy</h1>
              <p className="text-xs text-gray-600">မူဝါဒအချက်အလက်များ</p>
            </div>
          </div>
        </div>

        {/* Content Sections */}
        <div className="space-y-2 pb-6">
          <MobileSection number="1" title="အကျဉ်းချုပ်" content="ဝယ်ယူထားသောပစ္စည်းအတွက် ကျေနပ်မှုမရှိပါက အောက်ပါမူဝါဒအရ ပြန်သွင်းခြင်း၊ ဖလှယ်ခြင်း သို့မဟုတ် ပြန်အမ်းငွေ ယူနိုင်ပါသည်။" />
          <MobileSection number="2" title="ပြန်အမ်းငွေ ရယူနိုင်ခြင်းအတွက် လိုအပ်ချက်များ" content="ပြန်အမ်းငွေ ပြုလုပ်ရန် အောက်ပါအချက်များ ပြည့်မီရမည်—

ဝယ်ယူသည့်နေ့မှ ၇ ရက်အတွင်းသာ အကျုံးဝင်ပါမည်။ ဝယ်ယူထားသောပစ္စည်းသည် error (သို့) damage ဖြစ်မှသာ ပြန်သွင်းခြင်း၊ ဖလှယ်ခြင်း (သို့) ပြန်အမ်းငွေယူခြင်းအတွက်အကျုံးဝင်ပါမည်။
ပစ္စည်းသည် အသုံးမပြုရသေးသည့်အခြေအနေ၊ မူရင်းထုပ်ပိုးမှု ဖြင့် ပြန်လည်ပို့ရပါမည်။ (ပျက်စီးသွားပါက Return အကျုံးဝင်မည်မဟုတ်ပါ။)
ဝယ်ယူထားကြောင်းအထောက်အထား (ဘောက်ချာ သို့မဟုတ် အော်ဒါနံပါတ်) လိုအပ်သည်။" />
          <MobileSection number="3" title=" ပြန်အမ်းငွေ သတ်မှတ်ချက် " content="ပြန်အမ်းငွေသည် မူရင်းငွေပေးချေခဲ့သော အကောင့် (သို့) ငွေပေးချေမှုနည်းလမ်း အတိုင်းသာ ပြန်အမ်းပါမည်။

အောက်ပါအချက်များကို မပြုလုပ်နိုင်ပါ—

Card (သို့) ဘဏ်အကောင့် (သို့) ပေးချေမှုပုံစံ မတူညီခြင်း၊ ငွေသားဖြင့် ပြန်အမ်းခြင်း၊ ငွေလွှဲထားသော အကောင့်မဟုတ်သည့် အခြားအကောင့်သို့ ပြန်အမ်းငွေ လွှဲပြောင်းပေးခြင်း။" />
          <MobileSection number="4" title=" ပြန်အမ်းငွေ(သို့) ပြန်သွင်းခြင်း၊ ဖလှယ်ခြင်း မရနိုင်သည့် ပစ္စည်းများ
" content="(a)ပရိုမိုးရှင်းပစ္စည်းများ
(b)Clearance / final-sale ပစ္စည်းများ၊ 
(c)ကြိုတင်မှာယူထားသောပစ္စည်းများ (Pre Order Products)" />
          <MobileSection number="5" title="ပျက်စီးခြင်း သို့မဟုတ် ချို့ယွင်းသည့် ပစ္စည်းများ" content="ဝယ်ယူထားသောပစ္စည်း သည် ပစ္စည်းပျက်စီး သို့မဟုတ် error အဖြစ်ရောက်လာပါက ၇ ရက်အတွင်း ဓာတ်ပုံနှင့်အတူ ဆက်သွယ်ရပါမည်။
အစားထိုးပစ္စည်း သို့မဟုတ် ဝယ်ယူထားသော တန်ဖိုးအတိုင်း ပြန်အမ်းငွေ ရရှိမည်။" />
          <MobileSection number="6" title="ပြန်သွင်းရန် လုပ်ဆောင်မှုများ" content="(a) ပြန်သွင်းလိုပါက အရောင်းဌာနသို့ ဆက်သွယ်ပါ။
(b) ပြန်ပို့ရန် လမ်းညွှန်ချက်များနှင့် လိုအပ်သော အကြောင်းအရာများကို သက်ဆိုင်ရာအရောင်းမှ ပေးပို့ပေးပါမည်။
(c)  Return ပြန်လာသည့်ပစ္စည်းကို စစ်ဆေးပြီး ပြန်အမ်းငွေ(သို့) ပြန်သွင်းခြင်း၊ ဖလှယ်ခြင်း ရနိုင်မရနိုင် အကြောင်းကြားပေးပါမည်။
(d) အတည်ပြုပြီးပါက ရုံးဖွင့်ရက် ၃ ရက်အတွင်း ဝယ်ယူစဉ်က ငွေပေးချေခဲ့သော မူရင်းအကောင့်သို့ ပြန်အမ်းငွေ လွှဲပေးပါမည်။" />
          <MobileSection number="7" title="Return ပစ္စည်းပို့ဆောင်ခ ပေးချေမှု" content="ကျွန်ုပ်တို့ဘက်မှ ချို့ယွင်းခြင်း/မှားယွင်းပို့ခြင်း ဖြစ်ပါက ပြန်ပို့ခအား ကျွန်ုပ်တို့က ကုန်ကျခံပါမည်။
အခြားအကြောင်းကြောင့် ပစ္စည်းပြန်ပို့ပါက ပို့ဆောင်ခအား ဝယ်ယူသူဘက်မှ ပေးချေရပါမည်။" />
          <MobileSection number="8" title="ပြန်အမ်းငွေပြုလုပ်မည်ဆိုပါက လိုအပ်သောအချက်များ" content="(a) Customer Return ပစ္စည်းများအတွက် ငွေပြန်အမ်းခြင်း နှင့် Customer မှ ငွေပိုလွှဲခြင်းများအတွက် သက်ဆိုင်ရာအ‌ရောင်းမှ Finance Dept: သို့ Refund Form (ငွေထုတ်ဘောက်ချာ) တင်ပေးရပါမည်။ Refund Form နှင့်အတူ Customer မှ ငွေလွှဲထားသော စလစ် (သို့) Bank transfer Screenshot အားနောက်တွဲအဖြစ်တစ်ပါတည်းပူးတွဲ တင်ပေးရပါမည်။ ရောင်းထားသောဘောက်ချာမှ ငွေပို၍ ပြန်အမ်းခြင်းများအတွက် အရောင်းဘောက်ချာပါပူးတွဲတင်ပေးရပါမည်။
(b) Refund Form (ငွေထုတ်ဘောက်ချာ) တင်ပြီး Finance Dept: မှစစ်ဆေးပြီးနောက် ၃ ရက်အတွင်း Refund ပြန်လုပ်ပေးပါမည်။
" />
        </div>
      </div>
    </div>
  )
}
