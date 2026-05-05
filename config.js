module.exports = {
    /**
     * 调试模式
     * 
     * 如果为true，显示加载插件、使用插件接口的所有详细信息
     * 如果为false，默认使用插件的所有功能，未说明的均不显示
     */
    debug: true,
    /**
     * 对外API设置
     */
    api: {
        /**
         * API端口
         * 
         * 请在云服务商安全组和服务器防火墙中放行该端口
         */
        port: 30600,
        /**
         * API秘钥
         */
        token: "your-api-token"
    },
    /**
     * Minecraft后端服务器设置
     */
    minecraft: {
        /**
         * 服务器进服IP（如果有代理，这里填写代理）
         */
        ip: "127.0.0.1:25565",
        /**
         * 服务器启动参数
         * 
         * 如果需要填写路径，请用双引号括起来
         */
        args: [
            `java`,
            `-Dfile.encoding=UTF-8`,
            `-Dsun.stdout.encoding=UTF-8`,
            `-Dsun.stderr.encoding=UTF-8`,
            `-jar`,
            `"D:\\luminol\\server.jar"`
        ],
        /**
         * MC服务器执行路径
         */
        cwd: "D:\\luminol",
        /**
         * 自动重启
         */
        autoRestart: {
            enable: true,
            /**
             * 重启时发送QQ消息
             */
            sendQQBotMessage: true
        },
        /**
         * 日志正则表达式
         * 
         * 用于匹配日志
         */
        logRegexs: {
            /**
             * 玩家进服日志
             */
            playerJoin: /^\[(\d{2}:\d{2}:\d{2}) INFO\]: (\S+) joined the game$/,
            /**
             * 玩家退出服日志
             */
            playerQuit: /^\[(\d{2}:\d{2}:\d{2}) INFO\]: (\S+) left the game$/,
            /**
             * 玩家发送消息
             * 
             * 如果你服务器的消息格式类似于[XX:XX:XX INFO]: [一个或多个标签] 玩家名: 消息，请启用：
             * /^\[(\d{2}:\d{2}:\d{2}) INFO\]: .*\] (\S+): (.+)$/
             * 如果为原版消息格式，请启用：
             * /^\[(\d{2}:\d{2}:\d{2}) INFO\]: <(\S+)> (.+)$/
             */
            playerSendMessage: /^\[(\d{2}:\d{2}:\d{2}) INFO\]: <(\S+)> (.+)$/,
            /**
             * 玩家发送指令
             */
            playerSendCommand: /^\[(\d{2}:\d{2}:\d{2}) INFO\]: (\S+) issued server command: \/(.+)$/
        }
    },
    /**
     * QQ机器人设置 (OneBot11协议)
     */
    qqbot: {
        /**
         * QQ机器人服务端地址
         */
        server: "https://51e35f1.r23.cpolar.top",
        /**
         * QQ机器人秘钥
         */
        token: "123456",
        /**
         * 发送消息的群号列表
         */
        groupIds: [1083507759],
        /**
         * 服务器自动重启消息模板
         * 
         * 可用变量：{time} - 重启时间
         */
        autoRestartMessage: "服务器已于 {time} 自动重启"
    }
}
