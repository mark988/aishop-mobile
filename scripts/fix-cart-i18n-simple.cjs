#!/usr/bin/env node
/**
 * Cart.tsx 多语言自动化修复脚本 - 简化版
 * 使用精确的字符串替换
 */

const fs = require('fs');
const path = require('path');

const CART_FILE = path.join(__dirname, '../src/pages/Cart.tsx');
const BACKUP_FILE = path.join(__dirname, '../src/pages/Cart.tsx.backup');

// 精确替换规则数组
const replacements = [
  // 1. 全选
  ['<span className="ml-2 text-sm text-gray-700">全选</span>', '<span className="ml-2 text-sm text-gray-700">{t(\'cart.select_all_checkbox\')}</span>'],

  // 2. 已选商品
  ['已选 {selectedCount} 件商品', '{t(\'cart.selected_count\', {count: selectedCount})}'],

  // 3. 积分兑换/积分抵扣标题
  ['{hasOnlyPointsProducts ? \'积分兑换\' : \'积分抵扣\'}', '{t(hasOnlyPointsProducts ? \'cart.points_exchange\' : \'cart.points_deduction\')}'],

  // 4. 仅积分商品
  ['仅积分商品', '{t(\'cart.only_points_products\')}'],

  // 5. 已开启/已关闭
  ['{usePointsDiscount ? \'已开启\' : \'已关闭\'}', '{t(usePointsDiscount ? \'cart.discount_enabled\' : \'cart.discount_disabled\')}'],

  // 6. 积分使用分配
  ['积分使用分配：', '{t(\'cart.points_usage_detail\')}'],

  // 7. 积分商品兑换
  ['• 积分商品兑换：', '{t(\'cart.points_for_product_exchange\')}'],

  // 8. 剩余可用积分
  ['• 剩余可用积分：', '{t(\'cart.remaining_usable_points\')}'],

  // 9. 积分单位 - 多个地方
  ['{totalPointsRequired}积分', '{totalPointsRequired}{t(\'cart.points_unit\')}'],
  ['{pointsToUse}积分', '{pointsToUse}{t(\'cart.points_unit\')}'],

  // 10. 积分不足警告
  ['积分不足！还需要 {totalPointsRequired - pointsInfo.currentPoints} 积分', '{t(\'cart.points_insufficient_warning\', {count: totalPointsRequired - pointsInfo.currentPoints})}'],

  // 11. 用于普通商品/使用
  ['{hasMixedProducts ? \'用于普通商品:\' : \'使用:\'}', '{t(hasMixedProducts ? \'cart.for_normal_products\' : \'cart.use_for\')}'],

  // 12. 普通商品抵扣/抵扣金额
  ['{hasMixedProducts ? \'普通商品抵扣:\' : \'抵扣金额:\'}', '{t(hasMixedProducts ? \'cart.normal_product_deduction\' : \'cart.discount_amount\')}'],

  // 13. 最终剩余积分/剩余积分
  ['{hasMixedProducts ? \'最终剩余积分:\' : \'剩余积分:\'}', '{t(hasMixedProducts ? \'cart.final_remaining\' : \'cart.remaining_points\')}'],

  // 14. 开启积分抵扣
  ['<span className="text-sm">开启积分抵扣</span>', '<span className="text-sm">{t(\'cart.open_points_discount\')}</span>'],

  // 15. 小计
  ['小计: ', '{t(\'cart.subtotal_label\')}: '],

  // 16. 优惠券标签
  ['优惠券: ', '{t(\'cart.coupon_discount\')}: '],

  // 17. 积分抵扣标签
  ['积分抵扣: ', '{t(\'cart.points_discount_label\')}: '],

  // 18. 实付
  ['实付: ', '{t(\'cart.actual_payment\')}: '],

  // 19. 积分不足，无法兑换 - 标题
  ['<h4 className="text-sm font-bold text-orange-800 mb-1">积分不足，无法兑换</h4>', '<h4 className="text-sm font-bold text-orange-800 mb-1">{t(\'cart.points_insufficient_cannot_exchange_title\')}</h4>'],

  // 20. 您有X张可用优惠券
  ['您有 {coupons.length} 张可用优惠券', '{t(\'cart.you_have_available\', {count: coupons.length})}'],

  // 21. 选择优惠券立享折扣
  ['选择优惠券立享折扣，节省更多！', '{t(\'cart.choose_and_save\')}'],

  // 22. 移除优惠券
  ['title="移除优惠券"', 'title={t(\'cart.remove_coupon\')}'],

  // 23. 选择优惠券：
  ['<p className="text-xs text-gray-600 font-medium">选择优惠券：</p>', '<p className="text-xs text-gray-600 font-medium">{t(\'cart.choose_coupon\')}</p>'],

  // 24. 查看更多优惠券
  ['查看更多优惠券 ({coupons.length - 3}张)', '{t(\'cart.view_more_coupons\', {count: coupons.length - 3})}'],

  // 25. 暂无可用优惠券
  ['<p className="text-sm text-gray-600 mb-1">暂无可用优惠券</p>', '<p className="text-sm text-gray-600 mb-1">{t(\'cart.no_coupons_available\')}</p>'],

  // 26. 完成更多任务获取优惠券
  ['<p className="text-xs text-gray-500">完成更多任务获取优惠券</p>', '<p className="text-xs text-gray-500">{t(\'cart.complete_tasks\')}</p>'],
];

function fixCartFile() {
  console.log('🔧 开始修复 Cart.tsx 多语言问题...\n');

  // 读取原文件
  if (!fs.existsSync(CART_FILE)) {
    console.error('❌ 错误：找不到 Cart.tsx 文件');
    console.error('   期望路径:', CART_FILE);
    process.exit(1);
  }

  let content = fs.readFileSync(CART_FILE, 'utf8');
  const originalContent = content;

  // 创建备份
  console.log('📦 创建备份文件...');
  fs.writeFileSync(BACKUP_FILE, content);
  console.log('✅ 备份已保存到:', path.basename(BACKUP_FILE));
  console.log('');

  // 应用替换规则
  let replacedCount = 0;
  console.log('🔄 应用替换规则...\n');

  replacements.forEach(([search, replace], index) => {
    const beforeLength = content.length;
    const occurrences = (content.match(new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;

    content = content.split(search).join(replace);

    if (content.length !== beforeLength) {
      replacedCount++;
      console.log(`✓ 规则 ${String(index + 1).padStart(2, '0')}: ${occurrences} 处替换 - ${search.substring(0, 40)}...`);
    } else {
      console.log(`- 规则 ${String(index + 1).padStart(2, '0')}: 未找到匹配 - ${search.substring(0, 40)}...`);
    }
  });

  // 检查是否有变化
  if (content === originalContent) {
    console.log('');
    console.log('⚠️  警告：没有应用任何替换！');
    console.log('   可能原因：');
    console.log('   1. 文件已经修复过了');
    console.log('   2. 文件内容与预期不符');
    console.log('');
    return;
  }

  // 保存修改后的文件
  console.log('');
  console.log('💾 保存修改...');
  fs.writeFileSync(CART_FILE, content);

  console.log('');
  console.log('====================================');
  console.log('✅ 修复完成！');
  console.log('====================================');
  console.log(`📊 成功应用 ${replacedCount}/${replacements.length} 个替换规则`);
  console.log('');
  console.log('📝 下一步：');
  console.log('  1. cd /Users/maxiaoguang/Downloads/aishop/mobile');
  console.log('  2. npm run dev  # 启动开发服务器');
  console.log('  3. 测试多语言切换功能');
  console.log('  4. 如有问题，恢复备份:');
  console.log('     cp', path.basename(BACKUP_FILE), path.basename(CART_FILE));
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
