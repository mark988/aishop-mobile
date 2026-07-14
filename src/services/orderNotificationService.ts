import { supabase } from '../lib/supabase'
import { pointsService } from './pointsService'

export interface OrderNotificationData {
    orderId: string
    userId: string
    userName: string
    userEmail: string
    total: number
    paymentMethod: string
    shippingMethod: string
    items: Array<{
        productName: string
        quantity: number
        price: number
    }>
}

class OrderNotificationService {
    /**
     * 发送订单成功通知给用户
     */
    async sendOrderSuccessNotificationToUser(data: OrderNotificationData) {
        try {
            // 创建用户通知
            await pointsService.createNotification(data.userId, {
                type: 'success',
                title: '🎉 订单提交成功！',
                message: `您的订单 #${data.orderId.slice(-8)} 已成功提交，订单金额 ¥${data.total.toLocaleString()}。我们将尽快为您处理。`
            })

            console.log(`✅ Order success notification sent to user ${data.userId}`)
        } catch (error) {
            console.error('❌ Failed to send order success notification to user:', error)
        }
    }

    /**
     * 发送新订单通知给所有管理员
     */
    async sendNewOrderNotificationToAdmins(data: OrderNotificationData) {
        try {
            // 获取所有管理员用户
            const { data: adminUsers, error } = await supabase
                .from('profiles')
                .select('id, name, email')
                .eq('role', 'admin')

            if (error) {
                console.error('Failed to fetch admin users:', error)
                return
            }

            if (!adminUsers || adminUsers.length === 0) {
                console.log('No admin users found')
                return
            }

            // 为每个管理员创建通知
            const notificationPromises = adminUsers.map(admin =>
                pointsService.createNotification(admin.id, {
                    type: 'info',
                    title: '🛒 新订单提醒',
                    message: `用户 ${data.userName} 刚刚下了一个新订单！订单号：#${data.orderId.slice(-8)}，金额：¥${data.total.toLocaleString()}，支付方式：${this.getPaymentMethodName(data.paymentMethod)}。请及时处理。`
                })
            )

            await Promise.all(notificationPromises)

            console.log(`✅ New order notifications sent to ${adminUsers.length} admins`)
        } catch (error) {
            console.error('❌ Failed to send new order notifications to admins:', error)
        }
    }

    /**
     * 发送浏览器通知给管理员（需要权限）
     */
    async sendBrowserNotificationToAdmins(data: OrderNotificationData) {
        try {
            // 检查浏览器通知权限
            if ('Notification' in window && Notification.permission === 'granted') {
                const notification = new Notification('🛒 新订单提醒', {
                    body: `用户 ${data.userName} 下了新订单，金额 ¥${data.total.toLocaleString()}`,
                    icon: '/favicon.ico',
                    badge: '/favicon.ico',
                    tag: `order-${data.orderId}`,
                    requireInteraction: true, // 需要用户交互才能关闭
                    actions: [
                        {
                            action: 'view',
                            title: '查看订单'
                        }
                    ]
                })

                // 点击通知时的处理
                notification.onclick = () => {
                    window.focus()
                    // 可以跳转到订单管理页面
                    window.location.href = '/admin?tab=orders'
                    notification.close()
                }

                // 5秒后自动关闭
                setTimeout(() => {
                    notification.close()
                }, 5000)

                console.log('✅ Browser notification sent to admins')
            }
        } catch (error) {
            console.error('❌ Failed to send browser notification:', error)
        }
    }

    /**
     * 播放新订单提示音
     */
    async playNewOrderSound() {
        try {
            // 创建音频上下文
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()

            // 创建一个简单的提示音
            const oscillator = audioContext.createOscillator()
            const gainNode = audioContext.createGain()

            oscillator.connect(gainNode)
            gainNode.connect(audioContext.destination)

            // 设置音频参数
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime) // 高音
            oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1) // 低音
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2) // 高音

            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)

            oscillator.start(audioContext.currentTime)
            oscillator.stop(audioContext.currentTime + 0.3)

            console.log('✅ New order sound played')
        } catch (error) {
            console.error('❌ Failed to play new order sound:', error)

            // 备用方案：使用简单的beep声音
            try {
                const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT')
                audio.play()
            } catch (fallbackError) {
                console.error('❌ Fallback sound also failed:', fallbackError)
            }
        }
    }

    /**
     * 综合处理订单通知
     */
    async handleOrderSuccess(data: OrderNotificationData) {
        console.log('🔔 Processing order success notifications...', data)

        // 并行发送所有通知
        await Promise.all([
            // 1. 给用户发送成功通知
            this.sendOrderSuccessNotificationToUser(data),

            // 2. 给管理员发送新订单通知
            this.sendNewOrderNotificationToAdmins(data),

            // 3. 发送浏览器通知给管理员
            this.sendBrowserNotificationToAdmins(data),

            // 4. 播放提示音
            this.playNewOrderSound()
        ])

        console.log('✅ All order notifications processed')
    }

    /**
     * 获取支付方式的中文名称
     */
    private getPaymentMethodName(paymentMethod: string): string {
        const paymentMethods: { [key: string]: string } = {
            'cod': '货到付款',
            'credit_card': '信用卡',
            'alipay': '支付宝',
            'wechat': '微信支付',
            'stripe': 'Stripe',
            'paypal': 'PayPal'
        }
        return paymentMethods[paymentMethod] || paymentMethod
    }

    /**
     * 请求浏览器通知权限
     */
    async requestNotificationPermission(): Promise<boolean> {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission()
            return permission === 'granted'
        }
        return false
    }
}

export const orderNotificationService = new OrderNotificationService()