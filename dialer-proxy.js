function main(config) {
  const rawProxies = Array.isArray(config.proxies) ? config.proxies : [];

  // 统一定义健康检查（测速）参数
  const healthCheckUrl = "https://www.apple.com/library/test/success.html";
  const healthCheckInterval = 300;

  // 如果原配置中包含 proxy-providers，自动为其补齐 health-check
  if (config["proxy-providers"]) {
    for (const key in config["proxy-providers"]) {
      config["proxy-providers"][key]["interval"] = config["proxy-providers"][key]["interval"] || 86400;
      config["proxy-providers"][key]["health-check"] = {
        enable: true,
        url: healthCheckUrl,
        interval: healthCheckInterval
      };
    }
  }

  // 清理节点名称中的零宽/不可见字符，避免正则匹配失效
  const invisibleCharsRegex = /[\u00AD\u180E\u200B\u200E\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/g;
  const cleanName = (name) => (typeof name === "string" ? name.replace(invisibleCharsRegex, "") : "");

  // 1. 定义需要识别的地区组及其正则匹配规则
  // regex 用于 JS 侧精确匹配（使用前后非字母边界）；filter 用于 Mihomo RE2 引擎
  const regionConfigs = [
    {
      name: "香港",
      regex: /🇭🇰|香港|(?<![A-Za-z])HKG?(?![A-Za-z])|hong\s*kong/i,
      filter: "(?i)🇭🇰|香港|(?:^|[^A-Za-z])HKG?(?:[^A-Za-z]|$)|hong\\s*kong",
      icon: "https://cdn.jsdmirror.com/gh/AIsouler/MyClash@main/Icons/svg/HongKong.svg"
    },
    {
      name: "台湾",
      regex: /🇹🇼|台湾|台北|高雄|(?<![A-Za-z])TWN?(?![A-Za-z])|taiwan|taipei/i,
      filter: "(?i)🇹🇼|台湾|台北|高雄|(?:^|[^A-Za-z])TWN?(?:[^A-Za-z]|$)|taiwan|taipei",
      icon: "https://cdn.jsdmirror.com/gh/AIsouler/MyClash@main/Icons/svg/Taiwan.svg"
    },
    {
      name: "日本",
      regex: /🇯🇵|日本|东京|大阪|(?<![A-Za-z])JPN?(?![A-Za-z])|japan/i,
      filter: "(?i)🇯🇵|日本|东京|大阪|(?:^|[^A-Za-z])JPN?(?:[^A-Za-z]|$)|japan",
      icon: "https://cdn.jsdmirror.com/gh/AIsouler/MyClash@main/Icons/svg/Japan.svg"
    },
    {
      name: "新加坡",
      regex: /🇸🇬|新加坡|狮城|(?<![A-Za-z])SGP?(?![A-Za-z])|singapore/i,
      filter: "(?i)🇸🇬|新加坡|狮城|(?:^|[^A-Za-z])SGP?(?:[^A-Za-z]|$)|singapore",
      icon: "https://cdn.jsdmirror.com/gh/AIsouler/MyClash@main/Icons/svg/Singapore.svg"
    },
    {
      name: "美国",
      regex: /🇺🇸|美国|洛杉矶|硅谷|圣何塞|西雅图|(?<![A-Za-z])USA?(?![A-Za-z])|united\s*states/i,
      filter: "(?i)🇺🇸|美国|洛杉矶|硅谷|圣何塞|西雅图|(?:^|[^A-Za-z])USA?(?:[^A-Za-z]|$)|united\\s*states",
      icon: "https://cdn.jsdmirror.com/gh/AIsouler/MyClash@main/Icons/svg/America.svg"
    }
  ];

  // 过滤机场信息/流量提示等非节点条目（已匹配到明确地区的节点保留）
  const excludeRegex = /剩余|流量|到期|官网|网址|订阅|重置|群|频道|客服|过期|教程|过滤|expire|traffic/i;
  const proxies = rawProxies.filter((p) => {
    if (!p || typeof p.name !== "string") return false;
    const name = cleanName(p.name);
    return regionConfigs.some((r) => r.regex.test(name)) || !excludeRegex.test(name);
  });

  const activeRegionGroups = [];
  const activeRegionNames = [];

  // 2. 检测订阅中是否存在对应地区的节点（有则生成，没有则跳过）
  for (const r of regionConfigs) {
    const matched = proxies.filter((p) => r.regex.test(cleanName(p.name))).map((p) => p.name);
    if (matched.length > 0) {
      activeRegionNames.push(r.name);
      activeRegionGroups.push({
        name: r.name,
        type: "select",
        proxies: matched,
        icon: r.icon
      });
    }
  }

  // 3. 检测是否存在“其它地区”节点
  const otherMatched = proxies
    .filter((p) => !regionConfigs.some((r) => r.regex.test(cleanName(p.name))))
    .map((p) => p.name);

  if (otherMatched.length > 0) {
    activeRegionNames.push("其它地区");
    activeRegionGroups.push({
      name: "其它地区",
      type: "select",
      proxies: otherMatched,
      icon: "https://cdn.jsdmirror.com/gh/AIsouler/MyClash@main/Icons/svg/WorldMap.svg"
    });
  }

  // 4. 生成链式代理克隆节点（为每个有效节点创建绑定 dialer-proxy: "前置代理" 的落地副本）
  const rawProxyNames = proxies.map((p) => p.name);
  const relayProxies = proxies.map((p) => ({
    ...p,
    name: `🔗 ${p.name}`,
    "dialer-proxy": "前置代理"
  }));
  const relayProxyNames = relayProxies.map((p) => p.name);

  // 兜底机制：如果是纯 proxy-providers 模式（原始 config.proxies 为空），保留地区组并开启 include-all
  const isProviderMode = rawProxies.length === 0;
  if (isProviderMode) {
    for (const r of regionConfigs) {
      activeRegionNames.push(r.name);
      activeRegionGroups.push({
        name: r.name,
        type: "select",
        "include-all": true,
        filter: r.filter,
        icon: r.icon
      });
    }
    activeRegionNames.push("其它地区");
    activeRegionGroups.push({
      name: "其它地区",
      type: "select",
      "include-all": true,
      "exclude-filter": "(?i)" + regionConfigs.map((r) => r.filter.replace("(?i)", "")).join("|"),
      icon: "https://cdn.jsdmirror.com/gh/AIsouler/MyClash@main/Icons/svg/WorldMap.svg"
    });
  } else {
    config.proxies = [...proxies, ...relayProxies];
  }

  // 5. 核心运行时与 TUN 配置覆写
  Object.assign(config, {
    "mixed-port": 7890,
    "allow-lan": true,
    "log-level": "error",
    "ipv6": true,
    "unified-delay": true,
    "tcp-concurrent": true,
    "find-process-mode": "off",
    "external-controller": "0.0.0.0:9090",
    "external-ui": "ui",
    "external-ui-url": "https://github.com/Zephyruso/zashboard/releases/latest/download/dist.zip",
    "profile": {
      "store-selected": true,
      "store-fake-ip": true
    },
    "tun": {
      "enable": true,
      "stack": "mips",
      "dns-hijack": ["udp://any:53", "tcp://any:53"],
      "auto-route": true,
      "auto-redirect": true,
      "auto-detect-interface": true,
      "route-exclude-address-set": ["cn_ip"]
    },
    "hosts": {
      "dns.alidns.com": ["223.5.5.5", "223.6.6.6"],
      "dns.google": ["8.8.8.8", "8.8.4.4"],
      "services.googleapis.cn": "services.googleapis.com"
    },
    "dns": {
      "enable": true,
      "ipv6": true,
      "cache-algorithm": "arc",
      "enhanced-mode": "fake-ip",
      "fake-ip-range": "198.18.0.1/15",
      "fake-ip-range6": "2001:2::1/48",
      "fake-ip-filter": ["rule-set:private_domain", "rule-set:cn_domain"],
      "default-nameserver": ["223.5.5.5"],
      "proxy-server-nameserver": ["https://dns.alidns.com/dns-query"],
      "direct-nameserver": ["https://dns.alidns.com/dns-query"],
      "direct-nameserver-follow-policy": true,
      "nameserver": ["https://dns.google/dns-query#代理"],
      "nameserver-policy": {
        "rule-set:private_domain": "system",
        "rule-set:cn_domain": "https://dns.alidns.com/dns-query"
      }
    }
  });

  // 6. 组装策略组（仅在“全部节点”保留测速参数）
  config["proxy-groups"] = [
    {
      name: "代理",
      type: "select",
      proxies: [...activeRegionNames, "链式代理", "全部节点"],
      icon: "https://cdn.jsdmirror.com/gh/AIsouler/MyClash@main/Icons/svg/Proxy.svg"
    },
    {
      name: "AI",
      type: "select",
      proxies: ["代理", ...activeRegionNames, "链式代理"],
      icon: "https://cdn.jsdmirror.com/gh/AIsouler/MyClash@main/Icons/svg/OpenAI.svg"
    },
    {
      name: "TG",
      type: "select",
      proxies: ["代理", ...activeRegionNames, "链式代理"],
      icon: "https://cdn.jsdmirror.com/gh/AIsouler/MyClash@main/Icons/svg/Telegram.svg"
    },
    ...activeRegionGroups,
    {
      name: "链式代理",
      type: "select",
      ...(relayProxyNames.length > 0
        ? { proxies: relayProxyNames }
        : { "include-all": true }),
      icon: "https://cdn.jsdmirror.com/gh/AIsouler/MyClash@main/Icons/svg/Static.svg"
    },
    {
      name: "前置代理",
      type: "select",
      ...(rawProxyNames.length > 0
        ? { proxies: rawProxyNames }
        : { "include-all": true }),
      icon: "https://cdn.jsdmirror.com/gh/AIsouler/MyClash@main/Icons/svg/Airport.svg"
    },
    {
      name: "全部节点",
      type: "select",
      url: healthCheckUrl,
      interval: healthCheckInterval,
      ...(rawProxyNames.length > 0
        ? { proxies: rawProxyNames }
        : { "include-all": true }),
      icon: "https://cdn.jsdmirror.com/gh/AIsouler/MyClash@main/Icons/svg/Global.svg"
    }
  ];

  // 7. 远程规则集与分流规则覆写
  const ipAnchor = { type: "http", interval: 86400, behavior: "ipcidr", format: "mrs", proxy: "代理" };
  const domainAnchor = { type: "http", interval: 86400, behavior: "domain", format: "mrs", proxy: "代理" };
  const textAnchor = { type: "http", interval: 86400, behavior: "domain", format: "text", proxy: "代理" };

  config["rule-providers"] = {
    "cn_domain": { ...domainAnchor, url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/cn.mrs", path: "./ruleset/cn_domain.mrs" },
    "geolocation-!cn": { ...domainAnchor, url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/geolocation-!cn.mrs", path: "./ruleset/geolocation-!cn.mrs" },
    "apple": { ...domainAnchor, url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/apple.mrs", path: "./ruleset/apple.mrs" },
    "private_domain": { ...domainAnchor, url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/private.mrs", path: "./ruleset/private_domain.mrs" },
    "telegram_domain": { ...domainAnchor, url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/telegram.mrs", path: "./ruleset/telegram_domain.mrs" },
    "youtube_domain": { ...domainAnchor, url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/youtube.mrs", path: "./ruleset/youtube_domain.mrs" },
    "AI": { ...domainAnchor, url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/category-ai-!cn.mrs", path: "./ruleset/AI.mrs" },
    "google_domain": { ...domainAnchor, url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/google.mrs", path: "./ruleset/google_domain.mrs" },
    "embydirect": { ...textAnchor, url: "https://raw.githubusercontent.com/sleepyxh/yxh/mihomo/emby.txt", path: "./ruleset/embydirect.txt" },
    "cn_ip": { ...ipAnchor, url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geoip/cn.mrs", path: "./ruleset/cn_ip.mrs" },
    "private_ip": { ...ipAnchor, url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geoip/private.mrs", path: "./ruleset/private_ip.mrs" },
    "telegram_ip": { ...ipAnchor, url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geoip/telegram.mrs", path: "./ruleset/telegram_ip.mrs" }
  };

  config["rules"] = [
    "AND,((NETWORK,UDP),(DST-PORT,443),(RULE-SET,youtube_domain)),REJECT",
    "RULE-SET,private_domain,DIRECT",
    "RULE-SET,private_ip,DIRECT,no-resolve",
    "RULE-SET,apple,DIRECT",
    "RULE-SET,embydirect,DIRECT",
    "RULE-SET,AI,AI",
    "RULE-SET,telegram_domain,TG",
    "RULE-SET,telegram_ip,TG,no-resolve",
    "RULE-SET,google_domain,代理",
    "RULE-SET,cn_domain,DIRECT",
    "RULE-SET,geolocation-!cn,代理",
    "RULE-SET,cn_ip,DIRECT",
    "MATCH,代理"
  ];

  return config;
}
