/**
 * 简单的JS版输入法，拿来玩玩还而已，没有多大实际使用意义
 * simple-input-method.js
 */
var 简易输入法 =
{
	候选汉字: '',
	候选拼音: '',
	匹配汉字: [], // 当前匹配到的汉字集合
	当前页: 1,
	每页大小: 5,
	总页数: 0,

	初始化字典: function () {
		var 字典 = pinyinUtil.dict;
		if (!字典.py2hz) throw '未找到合适的字典文件！';
		// 这一步仅仅是给字母a-z扩充，例如根据b找不到相关汉字，就把bi的结果赋值给b
		// 当然这种方式只是很简单的实现，真正的拼音输入法肯定不能这么简单处理
		字典.py2hz2 = {};
		字典.py2hz2['i'] = 'i'; // i比较特殊，没有符合的汉字，所以特殊处理
		for (var i = 97; i <= 123; i++) {
			var 字符 = String.fromCharCode(i);
			if (!字典.py2hz[字符]) {
				for (var j in 字典.py2hz) {
					if (j.indexOf(字符) == 0) {
						字典.py2hz2[字符] = 字典.py2hz[j];
						break;
					}
				}
			}
		}
	},
	初始化DOM: function () {
		var 弹窗 = document.createElement('div');
		弹窗.id = '简易输入法';
		弹窗.className = '简易输入法';
		弹窗.innerHTML = '<div class="拼音"></div>'
			+ '<div class="选中"><ol></ol>'
			+ '<div class="翻页"><span class="上页">▲</span><span class="下页">▼</span></div></div>';
		var that = this;
		// 初始化汉字选择和翻页键的点击事件
		弹窗.addEventListener('click', function (e) {
			var 事件目标 = e.target;
			if (事件目标.nodeName == 'LI') that.按索引选字(parseInt(事件目标.dataset.idx));
			else if (事件目标.nodeName == 'SPAN') {
				if (事件目标.className == '上页' && that.当前页 > 1) {
					that.当前页--;
					that.刷新当前页();
				}
				else if (事件目标.className == '下页' && that.当前页 < that.总页数) {
					that.当前页++;
					that.刷新当前页();
				}
			}
		})
		document.body.appendChild(弹窗);
	},
	初始化: function (选择器) {
		this.初始化字典();
		this.初始化DOM();
		输入元素 = document.querySelectorAll(选择器);
		this._弹窗 = document.querySelector('#简易输入法');
		this._弹窗拼音部分 = document.querySelector('#简易输入法 .拼音');
		this._弹窗选字部分 = document.querySelector('#简易输入法 .选中 ol');
		var that = this;
		for (var i = 0; i < 输入元素.length; i++) {
			输入元素[i].addEventListener('keydown', function (e) {
				var 键码 = e.keyCode;
				var 避免默认处理 = false;
				if (键码 >= 65 && 键码 <= 90) // A-Z
				{
					that.加英文字符(String.fromCharCode(键码 + 32), this);
					避免默认处理 = true;
				}
				else if (键码 == 8 && that.候选拼音) // 删除键
				{
					that.删英文字符();
					避免默认处理 = true;
				}
				else if (键码 >= 48 && 键码 <= 57 && !e.shiftKey && that.候选拼音) // 1-9
				{
					that.按索引选字(键码 - 48);
					避免默认处理 = true;
				}
				else if (键码 == 32 && that.候选拼音) // 空格
				{
					that.按索引选字(1);
					避免默认处理 = true;
				}
				else if (键码 == 33 && that.总页数 > 0 && that.当前页 > 1) // 上翻页
				{
					that.当前页--;
					that.刷新当前页();
					避免默认处理 = true;
				}
				else if (键码 == 34 && that.总页数 > 0 && that.当前页 < that.总页数) // 下翻页
				{
					that.当前页++;
					that.刷新当前页();
					避免默认处理 = true;
				}
				if (避免默认处理) e.preventDefault();
			});
			输入元素[i].addEventListener('focus', function () {
				// 如果选中的不是当前文本框，隐藏输入法
				if (that._输入元素 !== this) that.隐藏();
			});
		}
	},
	/**
	 * 单个拼音转单个汉字，例如输入 "a" 返回 "阿啊呵腌嗄吖锕"
	 */
	按单个拼音取汉字: function (拼音) {
		return pinyinUtil.dict.py2hz2[拼音] || pinyinUtil.dict.py2hz[拼音] || '';
	},
	/**
	 * 拼音转汉字
	 * @param pinyin 需要转换的拼音，如 zhongguo
	 * @return 返回一个数组，格式类似：[["中","重","种","众","终","钟","忠"], "zhong'guo"]
	 */
	拼音转汉字: function (拼音) {
		var 待选字 = this.按单个拼音取汉字(拼音);
		if (待选字) return [待选字.split(''), 拼音];
		var 前部 = '';
		for (var i = 0, len = 拼音.length; i < len; i++) {
			前部 += 拼音[i];
			待选字 = this.按单个拼音取汉字(前部);
			if (!待选字) continue;
			// flag表示如果当前能匹配到结果、并且往后5个字母不能匹配结果，因为最长可能是5个字母，如 zhuang
			var flag = false;
			if ((i + 1) < 拼音.length) {
				for (var j = 1, len = 拼音.length; j <= 5 && (i + j) < len; j++) {
					if (this.按单个拼音取汉字(拼音.substr(0, i + j + 1))) {
						flag = true;
						break;
					}
				}
			}
			if (!flag) return [待选字.split(''), 拼音.substr(0, i + 1) + "'" + 拼音.substr(i + 1)];
		}
		return [[], '']; // 理论上一般不会出现这种情况
	},
	/**
	 * 选择某个汉字，i有效值为1-5
	 */
	按索引选字: function (i) {
		var 选中字 = this.匹配汉字[(this.当前页 - 1) * this.每页大小 + i - 1];
		if (!选中字) return;
		this.候选汉字 += 选中字;
		var 分隔位置 = this.候选拼音.indexOf("'");
		if (分隔位置 > 0) {
			this.候选拼音 = this.候选拼音.substr(分隔位置 + 1);
			this.刷新();
		}
		else // 如果没有单引号，表示已经没有候选词了
		{
			this._输入元素.value += this.候选汉字;
			this.隐藏();
		}
	},
	/**
	 * 将拼音转换成汉字候选词，并显示在界面上
	 */
	刷新: function () {
		var temp = this.拼音转汉字(this.候选拼音.replace(/'/g, ''));
		this.匹配汉字 = temp[0];
		this.候选拼音 = temp[1];
		var count = this.匹配汉字.length;
		this.当前页 = 1;
		this.总页数 = Math.ceil(count / this.每页大小);
		this._弹窗拼音部分.innerHTML = this.候选汉字 + this.候选拼音;
		this.刷新当前页();
	},
	刷新当前页: function () {
		var temp = this.匹配汉字.slice((this.当前页 - 1) * this.每页大小, this.当前页 * this.每页大小);
		var html = '';
		var i = 0;
		temp.forEach(function (val) {
			html += '<li data-idx="' + (++i) + '">' + val + '</li>';
		});
		this._弹窗.querySelector('.上页').style.opacity = this.当前页 > 1 ? '1' : '.3';
		this._弹窗.querySelector('.下页').style.opacity = this.当前页 < this.总页数 ? '1' : '.3';
		this._弹窗选字部分.innerHTML = html;
	},
	加英文字符: function (字符, 输入元素) {
		if (this.候选拼音.length == 0) // 长度为1，显示输入法
		{
			this.显示(输入元素);
		}
		this.候选拼音 += 字符;
		this.刷新();
	},
	删英文字符: function () {
		if (this.候选拼音.length <= 1) {
			this.隐藏();
			return;
		}
		this.候选拼音 = this.候选拼音.substr(0, this.候选拼音.length - 1);
		this.刷新();
	},
	显示: function (输入元素) {
		var 位置 = 输入元素.getBoundingClientRect();
		this._弹窗.style.left = 位置.left + 'px';
		this._弹窗.style.top = 位置.top + 位置.height + document.body.scrollTop + 'px';
		this._输入元素 = 输入元素;
		this._弹窗.style.display = 'block';
	},
	隐藏: function () {
		this.重置();
		this._弹窗.style.display = 'none';
	},
	重置: function () {
		this.候选汉字 = '';
		this.候选拼音 = '';
		this.匹配汉字 = [];
		this.当前页 = 1;
		this.总页数 = 0;
		this._弹窗拼音部分.innerHTML = '';
	}
};