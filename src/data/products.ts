export interface Product {
    id: number;
    title: string;
    description: string;
    image: string;
    applicationImage: string;
}

export const products: Product[] = [
    {
        id: 1,
        title: "热中症预警仪",
        description: "实时监测环境温湿度，根据算法显示7种状态（如危险、严重警告、舒适等）",
        image: "/product/1.png",
        applicationImage: "/product/1-s.png",
    },
    {
        id: 2,
        title: "涂鸦WIFI智能气象钟",
        description: "通过WIFI连接涂鸦APP，自动获取网络标准时间及当地未来天气预报数据，同步显示室外温湿度。",
        image: "/product/2.png",
        applicationImage: "/product/2-s.png",
    },
    {
        id: 3,
        title: "蓝牙自动对时闹钟",
        description: "无需手动设置，手机蓝牙连接后自动同步时间，支持多国语言星期显示。",
        image: "/product/3.png",
        applicationImage: "/product/3-s.png",
    },
];
