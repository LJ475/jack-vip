import App from './App'

// #ifndef VUE3
import Vue from 'vue'
import './uni.promisify.adaptor'
Vue.config.productionTip = false
App.mpType = 'app'
const app = new Vue({
	...App
})
app.$mount()
// #endif

// #ifdef VUE3
import {
	createSSRApp
} from 'vue'
import { guardSession } from './utils/auth.js'
export function createApp() {
	const app = createSSRApp(App)
	// 全局登录闸门：没登录时任何页面一显示就被换回登录页（H5 的返回键和改 hash 都绕不过）。
	// uni 只在页面实例上触发 onShow，普通组件挂了这个钩子不会被调，所以可以安全地全局注册。
	app.mixin({
		onShow() {
			guardSession()
		}
	})
	return {
		app
	}
}
// #endif
