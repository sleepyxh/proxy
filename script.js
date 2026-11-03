function main(config) {
  // 1. 提取导入订阅中的所有真实节点
  const originalProxies = config.proxies || [];
  const proxyNames = originalProxies.map(p => p.name);

  // 2. 核心运行时配置
  config['mixed-port'] = 7890;
  config['allow-lan'] = true;
  config['log-level'] = 'error';
  config['ipv6'] = true;
  config['unified-delay'] = true;
  config['tcp-concurrent'] = true;

  // 启用 TUN 模式
  config['tun'] = {
    'dns-hijack': ['any:53'],
    'strict-route': true,
    'enable': true,
    'stack': 'mips',
    'auto-route': true,
    'auto-detect-interface': true
  };

  // 3. Hosts 与 DNS 配置
  config['hosts'] = {
    'dns.alidns.com': ['223.5.5.5', '223.6.6.6'],
    'dns.google': ['8.8.8.8', '8.8.4.4']
  };

  config['dns'] = {
    enable: true,
    'enhanced-mode': 'fake-ip',
    nameserver: ['https://dns.google/dns-query#代理&ecs=223.5.5.0/24'],
    'use-hosts': true,
    ipv6: true,
    'cache-algorithm': 'arc',
    'fake-ip-range': '198.18.0.1/16',
    'fake-ip-range6': 'fdfe:dcba:9876::1/64',
    'fake-ip-filter': [
      'rule-set:private_domain',
      'rule-set:cn_domain'
    ],
    'default-nameserver': [
      'https://223.5.5.5/dns-query'
    ],
    'nameserver-policy': {
      'rule-set:private_domain': 'system',
      'rule-set:cn_domain': 'https://dns.alidns.com/dns-query'
    },
    'proxy-server-nameserver': [
      'https://dns.alidns.com/dns-query'
    ],
    'direct-nameserver': [
      'https://dns.alidns.com/dns-query'
    ],
    'direct-nameserver-follow-policy': true
  };

  // 4. 远程规则集提供商 (全部走 GitHub 在线拉取与自动更新)
  config['rule-providers'] = {
    cn_domain: {
      type: 'http',
      behavior: 'domain',
      format: 'mrs',
      url: 'https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/cn.mrs',
      path: './ruleset/cn_domain.mrs',
      interval: 86400
    },
    cn_ip: {
      type: 'http',
      behavior: 'ipcidr',
      format: 'mrs',
      url: 'https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geoip/cn.mrs',
      path: './ruleset/cn_ip.mrs',
      interval: 86400
    },
    'geolocation-!cn': {
      type: 'http',
      behavior: 'domain',
      format: 'mrs',
      url: 'https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/geolocation-!cn.mrs',
      path: './ruleset/geolocation-!cn.mrs',
      interval: 86400
    },
    apple: {
      type: 'http',
      behavior: 'domain',
      format: 'mrs',
      url: 'https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/apple.mrs',
      path: './ruleset/apple.mrs',
      interval: 86400
    },
    private_domain: {
      type: 'http',
      behavior: 'domain',
      format: 'mrs',
      url: 'https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/private.mrs',
      path: './ruleset/private_domain.mrs',
      interval: 86400
    },
    private_ip: {
      type: 'http',
      behavior: 'ipcidr',
      format: 'mrs',
      url: 'https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geoip/private.mrs',
      path: './ruleset/private_ip.mrs',
      interval: 86400
    },
    telegram_domain: {
      type: 'http',
      behavior: 'domain',
      format: 'mrs',
      url: 'https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/telegram.mrs',
      path: './ruleset/telegram_domain.mrs',
      interval: 86400
    },
    telegram_ip: {
      type: 'http',
      behavior: 'ipcidr',
      format: 'mrs',
      url: 'https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geoip/telegram.mrs',
      path: './ruleset/telegram_ip.mrs',
      interval: 86400
    },
    embydirect: {
      type: 'http',
      behavior: 'domain',
      format: 'text',
      url: 'https://raw.githubusercontent.com/sleepyxh/yxh/mihomo/emby.txt',
      path: './ruleset/embydirect.txt',
      interval: 86400
    },
    youtube_domain: {
      type: 'http',
      behavior: 'domain',
      format: 'mrs',
      url: 'https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/youtube.mrs',
      path: './ruleset/youtube_domain.mrs',
      interval: 86400
    },
    AI: {
      type: 'http',
      behavior: 'domain',
      format: 'mrs',
      url: 'https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/category-ai-!cn.mrs',
      path: './ruleset/AI.mrs',
      interval: 86400
    },
    google_domain: {
      type: 'http',
      behavior: 'domain',
      format: 'mrs',
      url: 'https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/google.mrs',
      path: './ruleset/google_domain.mrs',
      interval: 86400
    }
  };

  // 彻底移除原有的 proxy-providers（避免跨设备或不同订阅时找不到本地文件报错）
  delete config['proxy-providers'];

  // 5. 策略组 (Proxy Groups)
  // 如果原订阅有节点就填入节点，空订阅则兜底填 DIRECT
  const availableProxies = proxyNames.length > 0 ? proxyNames : ['DIRECT'];

  config['proxy-groups'] = [
    {
      name: '代理',
      type: 'select',
      proxies: availableProxies,
      icon: 'https://cdn.jsdmirror.com/gh/AIsouler/MyClash@main/Icons/svg/Proxy.svg'
    },
    {
      name: 'AI',
      type: 'select',
      // 默认走“代理”大组，展开列表里也有所有节点可单独指派
      proxies: ['代理', ...availableProxies],
      icon: 'https://cdn.jsdmirror.com/gh/AIsouler/MyClash@main/Icons/svg/OpenAI.svg'
    },
    {
      name: 'TG',
      type: 'select',
      // 默认走“代理”大组，展开列表里也有所有节点可单独指派
      proxies: ['代理', ...availableProxies],
      icon: 'https://cdn.jsdmirror.com/gh/AIsouler/MyClash@main/Icons/svg/Telegram.svg'
    }
  ];

  // 6. 分流规则 (Rules)
  config['rules'] = [
    'AND,((NETWORK,UDP),(DST-PORT,443),(RULE-SET,youtube_domain)),REJECT-DROP',
    'RULE-SET,private_domain,DIRECT',
    'RULE-SET,private_ip,DIRECT,no-resolve',
    'RULE-SET,apple,DIRECT',
    'RULE-SET,embydirect,DIRECT',
    'RULE-SET,AI,AI',
    'RULE-SET,telegram_domain,TG',
    'RULE-SET,telegram_ip,TG,no-resolve',
    'RULE-SET,google_domain,代理',
    'RULE-SET,cn_domain,DIRECT',
    'RULE-SET,geolocation-!cn,代理',
    'RULE-SET,cn_ip,DIRECT',
    'MATCH,代理'
  ];

  return config;
}
