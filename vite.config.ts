import vue from '@vitejs/plugin-vue'
import {resolve} from 'path'
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
    // 手动加载环境变量
    const env = loadEnv(mode, process.cwd());
    // 打印所有环境变量，确认是否加载了正确的值
    return {
        plugins: [vue()],
        resolve: {
            alias: {
                '@': resolve(__dirname, 'src')
            }
        },
        server: {
            port: 4000,
            proxy: {
                '/api': {
                    target: env.VITE_GATEWAY_ORIGIN,
                    changeOrigin: true,
                    rewrite: (path: string) => path.replace(/^\/api/, '')
                }
            }
        }
    };
});
