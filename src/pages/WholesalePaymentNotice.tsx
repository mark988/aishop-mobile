import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, CreditCard } from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext'

function MobileSection({ number, title, content }: { number: string; title: string; content: string }) {
  return (
    <div className="bg-white rounded-xl border border-blue-200 p-3 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <div className="w-7 h-7 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
          <span className="text-white text-xs font-bold">{number}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 text-sm leading-snug">{title}</h3>
          <p className="text-xs text-gray-700 leading-relaxed mt-1 whitespace-pre-wrap">{content}</p>
        </div>
      </div>
    </div>
  )
}

export default function WholesalePaymentNotice() {
  const { t, language } = useLanguage()

  const contentMy = {
    title: 'လက်ကားဖောက်သည်များအား အသိပေးချက်',
    subtitle: 'ကျေးဇူးပြု၍ မဖြစ်မနေ ဖတ်ရှုပါရန်',
    sections: [
      {
        number: '1',
        title: 'ခိုင်လုံသောအခြေခံ',
        content: 'ကျွန်ုပ်တို့ ကုမ္ပဏီသည် လူကြီးမင်းတို့အတွက် Customer Service ကိုပိုမိုကောင်းမွန်စွာ ဝန်ဆောင်မှုပေးနိုင်ရန် နှင့် အရောင်းလုပ်ငန်းစဉ်ပိုမိုလျှင်မြန်စေရန် အရောင်းလုပ်ငန်းစဉ်နှင့် ငွေပေးချေမှုစနစ်ကို အဆင့်မြှင့်တင် ထားပါသည်။'
      },
      {
        number: '2',
        title: 'အမှာစာအတည်ပြုချက်',
        content: 'လက်ကားအော်ဒါများကို သက်ဆိုင်ရာ OZ Group chatအတွင်း၌သာ အတည်ပြုအော်ဒါတင်ရပါမည်။ Private chat မှအော်ဒါတင်ခြင်းများ၊ ငွေပေးချေခြင်းများကို ကုမ္ပဏီမှ အတည်ပြုခြင်း သို့မဟုတ် အကာအကွယ်ပေးခြင်း ပြုနိုင်မည်မဟုတ်ပါ။'
      },
      {
        number: '3',
        title: 'ငွေပေးချေမှုအကောင့်',
        content: 'ကြိုတင်ငွေပေးချေမှုအားလုံးကို ကုမ္ပဏီမှ သတ်မှတ်ထားသော ငွေပေးချေမှုအကောင့် ( Daw Su Su Mon နှင့် Daw SoeSoe တို့မှ ပူးတွဲစီမံခန့်ခွဲထားသော အကောင့် ) များ သို့သာ လွှဲပြောင်းပေးရန် လိုအပ်ပါသည်။'
      },
      {
        number: '4',
        title: 'ဘဏ်အချက်အလက်',
        content: '1. KBZ Bank (Special) : 0275 1206 0013 57101 ( Daw Su Su Mon + 1 )\n2. CB Bank (Special) : 0003 1009 0000 9113 (Daw Su Su Mon)\n3. AYA Bank (Special) : 4003 6444 184 (Daw Su Su Mon + 1 )\n4. AYA Pay : 09679463313 (Daw Su Su Mon)\n5. YOMA Bank : 0027 1018 0011 527 (Daw Su Su Mon)\n6. Trusty : 0011 4100 00050 (Australian Made)\n7. Wave Pay : 09679463313 (Daw Su Su Mon)\n8. KBZ Pay : 09443805061 (Daw Ei Ei Mon)\n9. KBZ Pay : 09420049378 (U Aung Kyaw Zaw)'
      },
      {
        number: '5',
        title: 'OZ House တရားဝင်ချန်နယ်များ',
        content: 'FB: OZ House - Australia Products\nWebsite: https://www.ozhousemm.com/\nViber: 09780080555 / 09780080666\nPhone: 09780080555 / 09780080666\nWeChat ID: australianmade01 / OzWs_09760164027\nTiktok: @ozhouse_for_u\nTelegram: https://t.me/ozhouse8899\nInstagram: ozhouse2'
      },
      {
        number: '6',
        title: 'နိဂုံး',
        content: 'အသင့်အလျှောက်ဝင်သည့် အသိပေးချက်ကို ဖတ်ရှုသည့်အတွက် ကျေးဇူးတင်ပါသည်။ ကျွန်ုပ်တို့နှင့်ပူးပေါင်းအတူဖက်စပ်ကုန်သည်ခြင်းအတွက် ကျေးဇူးတင်ပါသည်။'
      }
    ]
  }

  const contentZh = {
    title: '批发商付款须知',
    subtitle: '请仔细阅读以下内容',
    sections: [
      {
        number: '1',
        title: '系统升级说明',
        content: '本公司已升级销售流程和支付系统，旨在为您提供更优质的客户服务，并加快销售流程。'
      },
      {
        number: '2',
        title: '订单确认要求',
        content: '批发订单必须在相关的OZ群组聊天中确认。\n通过私聊进行的订单和付款将无法得到本公司的确认或保障。'
      },
      {
        number: '3',
        title: '指定付款账户',
        content: '所有预付款必须转入本公司指定的支付账户（由Daw Su Su Mon和Daw SoeSoe共同管理的账户）。'
      },
      {
        number: '4',
        title: '银行信息',
        content: '1. KBZ Bank (Special) : 0275 1206 0013 57101 ( Daw Su Su Mon + 1 )\n2. CB Bank (Special) : 0003 1009 0000 9113 (Daw Su Su Mon)\n3. AYA Bank (Special) : 4003 6444 184 (Daw Su Su Mon + 1 )\n4. AYA Pay : 09679463313 (Daw Su Su Mon)\n5. YOMA Bank : 0027 1018 0011 527 (Daw Su Su Mon)\n6. Trusty : 0011 4100 00050 (Australian Made)\n7. Wave Pay : 09679463313 (Daw Su Su Mon)\n8. KBZ Pay : 09443805061 (Daw Ei Ei Mon)\n9. KBZ Pay : 09420049378 (U Aung Kyaw Zaw)'
      },
      {
        number: '5',
        title: 'OZ House官方渠道',
        content: '微信: australianmade01 / OzWs_09760164027\nFB: OZ House - Australia Products\n官网: https://www.ozhousemm.com/\nViber: 09780080555 / 09780080666\n电话: 09780080555 / 09780080666\nTiktok: @ozhouse_for_u\nTelegram: https://t.me/ozhouse8899\nInstagram: ozhouse2'
      },
      {
        number: '6',
        title: '感谢致辞',
        content: '感谢您仔细阅读本须知。感谢您与我们的合作。'
      }
    ]
  }

  const contentEn = {
    title: 'Wholesale Payment Notice',
    subtitle: 'Please read carefully',
    sections: [
      {
        number: '1',
        title: 'System Upgrade',
        content: 'Our company has upgraded its sales process and payment system to provide you with better customer service and expedite the sales process.'
      },
      {
        number: '2',
        title: 'Order Confirmation Requirements',
        content: 'Wholesale orders must be confirmed in the relevant OZ group chat.\nOrders and payments made through private chat will not be confirmed or guaranteed by our company.'
      },
      {
        number: '3',
        title: 'Designated Payment Account',
        content: 'All prepayments must be transferred to our designated payment account (an account jointly managed by Daw Su Su Mon and Daw SoeSoe).'
      },
      {
        number: '4',
        title: 'Bank Information',
        content: '1. KBZ Bank (Special) : 0275 1206 0013 57101 ( Daw Su Su Mon + 1 )\n2. CB Bank (Special) : 0003 1009 0000 9113 (Daw Su Su Mon)\n3. AYA Bank (Special) : 4003 6444 184 (Daw Su Su Mon + 1 )\n4. AYA Pay : 09679463313 (Daw Su Su Mon)\n5. YOMA Bank : 0027 1018 0011 527 (Daw Su Su Mon)\n6. Trusty : 0011 4100 00050 (Australian Made)\n7. Wave Pay : 09679463313 (Daw Su Su Mon)\n8. KBZ Pay : 09443805061 (Daw Ei Ei Mon)\n9. KBZ Pay : 09420049378 (U Aung Kyaw Zaw)'
      },
      {
        number: '5',
        title: 'OZ House Official Channels',
        content: 'FB: OZ House - Australia Products\nWebsite: https://www.ozhousemm.com/\nViber: 09780080555 / 09780080666\nPhone: 09780080555 / 09780080666\nWeChat ID: australianmade01 / OzWs_09760164027\nTiktok: @ozhouse_for_u\nTelegram: https://t.me/ozhouse8899\nInstagram: ozhouse2'
      },
      {
        number: '6',
        title: 'Thank You',
        content: 'Thank you for reading this notice carefully. We appreciate your cooperation with us.'
      }
    ]
  }

  const getContent = () => {
    if (language === 'my') return contentMy
    if (language === 'zh') return contentZh
    return contentEn
  }

  const content = getContent()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Background */}
      <div className="bg-gradient-to-b from-blue-50 to-transparent pt-2 pb-4 mb-2"></div>

      <div className="px-3">
        {/* Back Button */}
        <Link to="/" className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-xs font-medium">{language === 'zh' ? '返回' : language === 'my' ? 'ပြန်သွားပါ' : 'Back'}</span>
        </Link>

        {/* Title Section */}
        <div className="bg-white rounded-xl p-3 mb-4 border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-bold text-gray-900 leading-tight">{content.title}</h1>
              <p className="text-xs text-gray-600">{content.subtitle}</p>
            </div>
          </div>
        </div>

        {/* Content Sections */}
        <div className="space-y-2 pb-6">
          {content.sections.map((section) => (
            <MobileSection
              key={section.number}
              number={section.number}
              title={section.title}
              content={section.content}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
