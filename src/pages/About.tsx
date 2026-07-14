import React from 'react'

export default function About() {
  return (
    <div className="p-4">
      <div className="bg-white rounded-2xl p-6 shadow-soft">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">关于我们</h1>
        <div className="space-y-4 text-gray-700">
          <p>
            欢迎来到我们的移动端商城！我们致力于为用户提供优质的购物体验。
          </p>
          <p>
            我们的产品包括手机、电脑、配件等各类电子产品，所有商品均为正品，享受官方保修。
          </p>
          <p>
            如有任何问题，请联系我们的客服团队，我们将竭诚为您服务。
          </p>
        </div>
      </div>
    </div>
  )
}