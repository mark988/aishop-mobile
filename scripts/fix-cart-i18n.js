#!/usr/bin/env node
/**
 * Cart.tsx 多语言自动化修复脚本
 * 将硬编码的中文文本替换为 t() 翻译函数调用
 */

const fs = require('fs');
const path = require('path');

const CART_FILE = path.join(__dirname, '../src/pages/Cart.tsx');
const BACKUP_FILE = path.join(__dirname, '../src/pages/Cart.tsx.backup');

// 替换规则：[原文本的正则, 替换后的文本]
const replacements = [
  // 底部操作栏
  [/<span className="ml-2 text-sm text-gray-700">全选<\/span>/, '<span className="ml-2 text-sm text-gray-700">{t(\'cart.select_all_checkbox\')}</span>'],
  [/已选 \{selectedCount\} 件商品/, '{t(\'cart.selected_count\', {count: selectedCount})}'],
  [/\{totalPointsRequired\}积分(?!兑换|抵扣|可抵扣)/, '{t(\'cart.points_total\', {points: totalPointsRequired})}'],

  // 积分相关 - 标题
  [/(?<={hasOnlyPointsProducts \? ')积分兑换(' : ')积分抵扣/, "cart.points_exchange' : 'cart.points_deduction"],
  [/(?<=<span className="ml-2 text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded">\s*)仅积分商品(?=\s*<\/span>)/, '{t(\'cart.only_points_products\')}'],

  // 开关状态
  [/(?<=usePointsDiscount \? ')已开启(' : ')已关闭/, "cart.discount_enabled' : 'cart.discount_disabled"],

  // 积分使用分配
  [/积分使用分配：/, '{t(\'cart.points_usage_detail\')}'],
  [/• 积分商品兑换：/, '{t(\'cart.points_for_product_exchange\')}'],
  [/• 剩余可用积分：/, '{t(\'cart.remaining_usable_points\')}'],
  [/\{totalPointsRequired\}积分(?=<\/span>)/, '{totalPointsRequired}{t(\'cart.points_unit\')}'],
  [/\{Math\.max\(0, pointsInfo\.currentPoints - totalPointsRequired\)\.toLocaleString\(\)\}积分/, '{Math.max(0, pointsInfo.currentPoints - totalPointsRequired).toLocaleString()}{t(\'cart.points_unit\')}'],

  // 积分不足警告
  [/积分不足！还需要 \{totalPointsRequired - pointsInfo\.currentPoints\} 积分/, '{t(\'cart.points_insufficient_warning\', {count: totalPointsRequired - pointsInfo.currentPoints})}'],

  // 用于普通商品/使用
  [/(?<=hasMixedProducts \? ')用于普通商品:(' : ')使用:/, "cart.for_normal_products' : 'cart.use_for"],
  [/\{pointsToUse\}积分(?=<\/span>)/, '{pointsToUse}{t(\'cart.points_unit\')}'],

  // 抵扣金额
  [/(?<=hasMixedProducts \? ')普通商品抵扣:(' : ')抵扣金额:/, "cart.normal_product_deduction' : 'cart.discount_amount"],
  [/(?<=hasMixedProducts \? ')最终剩余积分:(' : ')剩余积分:/, "cart.final_remaining' : 'cart.remaining_points"],

  // 开启积分抵扣
  [/<span className="text-sm">开启积分抵扣<\/span>/, '<span className="text-sm">{t(\'cart.open_points_discount\')}</span>'],

  // 积分提示
  [/需要\{totalPointsRequired\}积分兑换积分商品，剩余\{Math\.max\(0, pointsInfo\.currentPoints - totalPointsRequired\)\}积分可抵扣普通商品/, '{t(\'cart.need_points_tip\', {required: totalPointsRequired, remaining: Math.max(0, pointsInfo.currentPoints - totalPointsRequired)})}'],
  [/⚠️ 积分不足！需要\{totalPointsRequired\}积分兑换积分商品，当前仅有\{pointsInfo\.currentPoints\}积分/, '{t(\'cart.insufficient_points_alert\', {required: totalPointsRequired, current: pointsInfo.currentPoints})}'],

  // 小计等标签
  [/小计: /, '{t(\'cart.subtotal_label\')}: '],
  [/优惠券: /, '{t(\'cart.coupon_discount\')}: '],
  [/积分抵扣: /, '{t(\'cart.points_discount_label\')}: '],
  [/实付: /, '{t(\'cart.actual_payment\')}: '],

  // 积分不足提示框
  [/<h4 className="text-sm font-bold text-orange-800 mb-1">积分不足，无法兑换<\/h4>/, '<h4 className="text-sm font-bold text-orange-800 mb-1">{t(\'cart.points_insufficient_cannot_exchange_title\')}</h4>'],
  [/需要 <span className="font-bold">\{totalPointsRequired\}<\/span> 积分兑换商品，\s*当前仅有 <span className="font-bold">\{pointsInfo\?\.currentPoints \|\| 0\}<\/span> 积分/, '{t(\'cart.need_points\', {required: totalPointsRequired, current: pointsInfo?.currentPoints || 0}).split(\'{required}\').map((part, i) => i === 0 ? part : <><span className="font-bold">{totalPointsRequired}</span>{part.split(\'{current}\')[0]}<span className="font-bold">{pointsInfo?.currentPoints || 0}</span>{part.split(\'{current}\')[1]}</>)}'],
  [/还差 <span className="font-bold">\{Math\.max\(0, totalPointsRequired - \(pointsInfo\?\.currentPoints \|\| 0\)\)\}<\/span> 积分/, '还差 <span className="font-bold">{Math.max(0, totalPointsRequired - (pointsInfo?.currentPoints || 0))}</span> {t(\'cart.points_unit\')}'],

  // 优惠券相关
  [/您有 \{coupons\.length\} 张可用优惠券/, '{t(\'cart.you_have_available\', {count: coupons.length})}'],
  [/选择优惠券立享折扣，节省更多！/, '{t(\'cart.choose_and_save\')}'],
  [/title="移除优惠券"/, 'title={t(\'cart.remove_coupon\')}'],
  [/<p className="text-xs text-gray-600 font-medium">选择优惠券：<\/p>/, '<p className="text-xs text-gray-600 font-medium">{t(\'cart.choose_coupon\')}</p>'],
  [/查看更多优惠券 \(\{coupons\.length - 3\}张\)/, '{t(\'cart.view_more_coupons\', {count: coupons.length - 3})}'],
  [/<p className="text-sm text-gray-600 mb-1">暂无可用优惠券<\/p>/, '<p className="text-sm text-gray-600 mb-1">{t(\'cart.no_coupons_available\')}</p>'],
  [/<p className="text-xs text-gray-500">完成更多任务获取优惠券<\/p>/, '<p className="text-xs text-gray-500">{t(\'cart.complete_tasks\')}</p>'],
];

function fixCartFile() {
  console.log('🔧 开始修复 Cart.tsx 多语言问题...\n');

  // 读取原文件
  if (!fs.existsSync(CART_FILE)) {
    console.error('❌ 错误：找不到 Cart.tsx 文件');
    process.exit(1);
  }

  let content = fs.readFileSync(CART_FILE, 'utf8');

  // 创建备份
  console.log('📦 创建备份文件...');
  fs.writeFileSync(BACKUP_FILE, content);
  console.log('✅ 备份已保存到:', BACKUP_FILE);
  console.log('');

  // 应用替换规则
  let replacedCount = 0;
  console.log('🔄 应用替换规则...\n');

  replacements.forEach(([pattern, replacement], index) => {
    const before = content;
    content = content.replace(pattern, replacement);

    if (before !== content) {
      replacedCount++;
      console.log(`✓ 规则 ${index + 1}: 已替换`);
    } else {
      console.log(`- 规则 ${index + 1}: 未匹配`);
    }
  });

  // 保存修改后的文件
  console.log('');
  console.log('💾 保存修改...');
  fs.writeFileSync(CART_FILE, content);

  console.log('');
  console.log('====================================');
  console.log('✅ 修复完成！');
  console.log('====================================');
  console.log(`📊 应用了 ${replacedCount}/${replacements.length} 个替换规则`);
  console.log('');
  console.log('📝 下一步：');
  console.log('  1. 检查修改后的文件');
  console.log('  2. 运行: npm run dev');
  console.log('  3. 测试多语言切换功能');
  console.log('  4. 如有问题，恢复备份: cp', BACKUP_FILE, CART_FILE);
  console.log('');
}

// 运行脚本
try {
  fixCartFile();
} catch (error) {
  console.error('❌ 发生错误:', error.message);
  console.error(error.stack);
  process.exit(1);
}
