/**
 * 简单的JS版输入法，拿来玩玩还而已，没有多大实际使用意义
 * simple-input-method.js
 */
var SimpleInputMethod = 
{
	候选汉字: '', // 候选汉字
	候选拼音: '', // 候选拼音
	匹配汉字: [], // 当前匹配到的汉字集合
	当前页: 1, // 当前页
	每页大小: 5, // 每页大小
	总页数: 0, // 总页数
	/**
	 * 初始化字典配置
	 */
	初始化字典: function()
	{
		var dict = pinyinUtil.dict;
		if(!dict.py2hz) throw '未找到合适的字典文件！';
		// 这一步仅仅是给字母a-z扩充，例如根据b找不到相关汉字，就把bi的结果赋值给b
		// 当然这种方式只是很简单的实现，真正的拼音输入法肯定不能这么简单处理
		dict.py2hz2 = {};
		dict.py2hz2['i'] = 'i'; // i比较特殊，没有符合的汉字，所以特殊处理
		for(var i=97; i<=123; i++)
		{
			var ch = String.fromCharCode(i);
			if(!dict.py2hz[ch])
			{
				for(var j in dict.py2hz)
				{
					if(j.indexOf(ch) == 0)
					{
						dict.py2hz2[ch] = dict.py2hz[j];
						break;
					}
				}
			}
		}
	},
	/**
	 * 初始化DOM结构
	 */
	初始化DOM: function()
	{
		var temp = '<div class="pinyin"></div><div class="result"><ol></ol><div class="page-up-down"><span class="page-up">▲</span><span class="page-down">▼</span></div></div>';
		var dom = document.createElement('div');
		dom.id = 'simle_input_method';
		dom.className = 'simple-input-method';
		dom.innerHTML = temp;
		var that = this;
		// 初始化汉字选择和翻页键的点击事件
		dom.addEventListener('click', function(e)
		{
			var target = e.target;
			if(target.nodeName == 'LI') that.按索引选字(parseInt(target.dataset.idx));
			else if(target.nodeName == 'SPAN')
			{
				if(target.className == 'page-up' && that.当前页 > 1)
				{
					that.当前页--;
					that.刷新当前页();
				}
				else if(target.className == 'page-down' && that.当前页 < that.总页数)
				{
					that.当前页++;
					that.刷新当前页();
				}
			}
		})
		document.body.appendChild(dom);
	},
	/**
	 * 初始化
	 */
	初始化: function(selector)
	{
		this.初始化字典();
		this.初始化DOM();
		obj = document.querySelectorAll(selector);
		this._target = document.querySelector('#simle_input_method');
		this._pinyinTarget = document.querySelector('#simle_input_method .pinyin');
		this._resultTarget = document.querySelector('#simle_input_method .result ol');
		var that = this;
		for(var i=0; i<obj.length; i++)
		{
			obj[i].addEventListener('keydown', function(e)
			{
				var keyCode = e.keyCode;
				var preventDefault = false;
				if(keyCode >= 65 && keyCode <= 90) // A-Z
				{
					that.加英文字符(String.fromCharCode(keyCode+32), this);
					preventDefault = true;
				}
				else if(keyCode == 8 && that.候选拼音) // 删除键
				{
					that.删英文字符();
					preventDefault = true;
				}
				else if(keyCode >= 48 && keyCode <= 57 && !e.shiftKey && that.候选拼音) // 1-9
				{
					that.按索引选字(keyCode-48);
					preventDefault = true;
				}
				else if(keyCode == 32 && that.候选拼音) // 空格
				{
					that.按索引选字(1);
					preventDefault = true;
				}
				else if(keyCode == 33 && that.总页数 > 0 && that.当前页 > 1) // 上翻页
				{
					that.当前页--;
					that.刷新当前页();
					preventDefault = true;
				}
				else if(keyCode == 34 && that.总页数 > 0 && that.当前页 < that.总页数) // 下翻页
				{
					that.当前页++;
					that.刷新当前页();
					preventDefault = true;
				}
				if(preventDefault) e.preventDefault();
			});
			obj[i].addEventListener('focus', function()
			{
				// 如果选中的不是当前文本框，隐藏输入法
				if(that._input !== this) that.隐藏();
			});
		}
	},
	/**
	 * 单个拼音转单个汉字，例如输入 "a" 返回 "阿啊呵腌嗄吖锕"
	 */
	按单个拼音取汉字: function(pinyin)
	{
		return pinyinUtil.dict.py2hz2[pinyin] || pinyinUtil.dict.py2hz[pinyin] || '';
	},
	/**
	 * 拼音转汉字
	 * @param pinyin 需要转换的拼音，如 zhongguo
	 * @return 返回一个数组，格式类似：[["中","重","种","众","终","钟","忠"], "zhong'guo"]
	 */
	拼音转汉字: function(pinyin)
	{
		var result = this.按单个拼音取汉字(pinyin);
		if(result) return [result.split(''), pinyin];
		var temp = '';
		for(var i=0, len = pinyin.length; i<len; i++)
		{
			temp += pinyin[i];
			result = this.按单个拼音取汉字(temp);
			if(!result) continue;
			// flag表示如果当前能匹配到结果、并且往后5个字母不能匹配结果，因为最长可能是5个字母，如 zhuang
			var flag = false;
			if((i+1) < pinyin.length)
			{
				for(var j=1, len = pinyin.length; j<=5 && (i+j)<len; j++)
				{
					if(this.按单个拼音取汉字(pinyin.substr(0, i+j+1)))
					{
						flag = true;
						break;
					}
				}
			}
			if(!flag) return [result.split(''), pinyin.substr(0, i+1) + "'" + pinyin.substr(i+1)];
		}
		return [[], '']; // 理论上一般不会出现这种情况
	},
	/**
	 * 选择某个汉字，i有效值为1-5
	 */
	按索引选字: function(i)
	{
		var hz = this.匹配汉字[(this.当前页 - 1) * this.每页大小 + i - 1];
		if(!hz) return;
		this.候选汉字 += hz;
		var idx = this.候选拼音.indexOf("'");
		if(idx > 0)
		{
			this.候选拼音 = this.候选拼音.substr(idx+1);
			this.刷新();
		}
		else // 如果没有单引号，表示已经没有候选词了
		{
			this._input.value += this.候选汉字;
			this.隐藏();
		}
	},
	/**
	 * 将拼音转换成汉字候选词，并显示在界面上
	 */
	刷新: function()
	{
		var temp = this.拼音转汉字(this.候选拼音.replace(/'/g, ''));
		this.匹配汉字 = temp[0];
		this.候选拼音 = temp[1];
		var count = this.匹配汉字.length;
		this.当前页 = 1;
		this.总页数 = Math.ceil(count / this.每页大小);
		this._pinyinTarget.innerHTML = this.候选汉字 + this.候选拼音;
		this.刷新当前页();
	},
	刷新当前页: function()
	{
		var temp = this.匹配汉字.slice((this.当前页-1)*this.每页大小, this.当前页*this.每页大小);
		var html = '';
		var i = 0;
		temp.forEach(function(val)
		{
			html += '<li data-idx="'+(++i)+'">' + val + '</li>';
		});
		this._target.querySelector('.page-up').style.opacity = this.当前页 > 1 ? '1' : '.3';
		this._target.querySelector('.page-down').style.opacity = this.当前页 < this.总页数 ? '1' : '.3';
		this._resultTarget.innerHTML = html;
	},
	加英文字符: function(ch, obj)
	{
		if(this.候选拼音.length == 0) // 长度为1，显示输入法
		{
			this.显示(obj);
		}
		this.候选拼音 += ch;
		this.刷新();
	},
	删英文字符: function()
	{
		if(this.候选拼音.length <= 1)
		{
			this.隐藏();
			return;
		}
		this.候选拼音 = this.候选拼音.substr(0, this.候选拼音.length-1);
		this.刷新();
	},
	显示: function(obj)
	{
		var pos = obj.getBoundingClientRect();
		this._target.style.left = pos.left + 'px';
		this._target.style.top = pos.top + pos.height + document.body.scrollTop + 'px';
		this._input = obj;
		this._target.style.display = 'block';
	},
	隐藏: function()
	{
		this.重置();
		this._target.style.display = 'none';
	},
	重置: function()
	{
		this.候选汉字 = '';
		this.候选拼音 = '';
		this.匹配汉字 = [];
		this.当前页 = 1;
		this.总页数 = 0;
		this._pinyinTarget.innerHTML = '';
	}
};