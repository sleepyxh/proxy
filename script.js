function main(config) {
  const proxies = config.proxies || [];

  // 统一定义健康检查（测速）参数
  const healthCheckUrl = "https://www.apple.com/library/test/success.html";
  const healthCheckInterval = 300;
  const groupHealthCheck = {
    url: healthCheckUrl,
    interval: healthCheckInterval
  };

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

  // 1. 定义需要识别的地区组及其正则匹配规则
  const regionConfigs = [
    {
      name: "香港",
      regex: /🇭🇰|港|hk|hongkong|hong\s*kong/i,
      filter: "(?i)🇭🇰|港|hk|hongkong|hong\\s*kong",
      icon: "https://cdn.jsdmirror.com/gh/AIsouler/MyClash@main/Icons/svg/HongKong.svg"
    },
    {
      name: "台湾",
      regex: /🇹🇼|台|台北|tw|taiwan|taipei/i,
      filter: "(?i)🇹🇼|台|台北|tw|taiwan|taipei",
      icon: "https://cdn.jsdmirror.com/gh/AIsouler/MyClash@main/Icons/svg/Taiwan.svg"
    },
    {
      name: "日本",
      regex: /🇯🇵|日|东京|大阪|jp|japan/i,
      filter: "(?i)🇯🇵|日|东京|大阪|jp|japan",
      icon: "https://cdn.jsdmirror.com/gh/AIsouler/MyClash@main/Icons/svg/Japan.svg"
    },
    {
      name: "新加坡",
      regex: /🇸🇬|新|狮城|sg|singapore/i,
      filter: "(?i)🇸🇬|新|狮城|sg|singapore",
      icon: "https://cdn.jsdmirror.com/gh/AIsouler/MyClash@main/Icons/svg/Singapore.svg"
    },
    {
      name: "美国",
      regex: /🇺🇸|美|洛杉矶|硅谷|圣何塞|西雅图|us|unitedstates|united\s*states/i,
      filter: "(?i)🇺🇸|美|洛杉矶|硅谷|圣何塞|西雅图|us|unitedstates|united\\s*states",
      icon: "https://cdn.jsdmirror.com/gh/AIsouler/MyClash@main/Icons/svg/America.svg"
    }
  ];

  const activeRegionGroups = [];
  const activeRegionNames = [];

  // 2. 检测订阅中是否存在对应地区的节点（有则生成，没有则跳过）
  for (const r of regionConfigs) {
    const matched = proxies.filter(p => r.regex.test(p.name)).map(p => p.name);
    if (matched.length > 0) {
      activeRegionNames.push(r.name);
      activeRegionGroups.push({
        name: r.name,
        type: "select",
        ...groupHealthCheck,
        proxies: matched,
        icon: r.icon
      });
    }
  }

  // 3. 检测是否存在“其它地区”节点
  const otherMatched = proxies
    .filter(p => !regionConfigs.some(r => r.regex.test(p.name)))
    .map(p => p.name);

  if (otherMatched.length > 0) {
    activeRegionNames.push("其它地区");
    activeRegionGroups.push({
      name: "其它地区",
      type: "select",
      ...groupHealthCheck,
      proxies: otherMatched,
      icon: "https://cdn.jsdmirror.com/gh/AIsouler/MyClash@main/Icons/svg/Global.svg"
    });
  }

  // 兜底机制：如果是纯 proxy-providers 模式（config.proxies 为空），保留地区组并开启 include-all
  const isProviderMode = proxies.length === 0;
  if (isProviderMode) {
    for (const r of regionConfigs) {
      activeRegionNames.push(r.name);
      activeRegionGroups.push({
        name: r.name,
        type: "select",
        ...groupHealthCheck,
        "include-all": true,
        filter: r.filter,
        icon: r.icon
      });
    }
    activeRegionNames.push("其它地区");
    activeRegionGroups.push({
      name: "其它地区",
      type: "select",
      ...groupHealthCheck,
      "include-all": true,
      "exclude-filter": regionConfigs.map(r => r.filter.replace("(?i)", "")).join("|"),
      icon: "https://cdn.jsdmirror.com/gh/AIsouler/MyClash@main/Icons/svg/Global.svg"
    });
  }

  // 4. 核心运行时与 TUN 配置覆写
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
      "disable-icmp-forwarding": true
    },
    "hosts": {
      "dns.alidns.com": ["223.5.5.5", "223.6.6.6"],
      "dns.google": ["8.8.8.8", "8.8.4.4"]
    },
    "dns": {
      "enable": true,
      "ipv6": true,
      "cache-algorithm": "arc",
      "enhanced-mode": "fake-ip",
      "fake-ip-range": "198.18.0.1/16",
      "fake-ip-range6": "fdfe:dcba:9876::1/64",
      "fake-ip-filter": ["rule-set:private_domain", "rule-set:cn_domain"],
      "default-nameserver": ["https://223.5.5.5/dns-query"],
      "proxy-server-nameserver": ["https://dns.alidns.com/dns-query"],
      "direct-nameserver": ["https://dns.alidns.com/dns-query"],
      "direct-nameserver-follow-policy": true,
      "nameserver": ["https://dns.google/dns-query#代理&ecs=223.5.5.0/24"],
      "nameserver-policy": {
        "rule-set:private_domain": "system",
        "rule-set:cn_domain": "https://dns.alidns.com/dns-query"
      }
    }
  });

  // 5. 组装策略组
  config["proxy-groups"] = [
    {
      name: "代理",
      type: "select",
      ...groupHealthCheck,
      proxies: [...activeRegionNames, "全部节点"],
      icon: "https://cdn.jsdmirror.com/gh/AIsouler/MyClash@main/Icons/svg/Proxy.svg"
    },
    {
      name: "AI",
      type: "select",
      ...groupHealthCheck,
      proxies: ["代理", ...activeRegionNames],
      icon: "https://cdn.jsdmirror.com/gh/AIsouler/MyClash@main/Icons/svg/OpenAI.svg"
    },
    {
      name: "TG",
      type: "select",
      ...groupHealthCheck,
      proxies: ["代理", ...activeRegionNames],
      icon: "https://cdn.jsdmirror.com/gh/AIsouler/MyClash@main/Icons/svg/Telegram.svg"
    },
    ...activeRegionGroups,
    {
      name: "全部节点",
      type: "select",
      ...groupHealthCheck,
      "include-all": true,
      icon: "https://cdn.jsdmirror.com/gh/AIsouler/MyClash@main/Icons/svg/Global.svg"
    }
  ];

  // 6. 远程规则集与分流规则覆写
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
