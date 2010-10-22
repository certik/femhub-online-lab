"""Configuration options for Online Lab services. """

options = [
    ('port', 'int'),
    ('debug', 'bool'),
    ('daemon', 'bool'),
    ('logs_path', 'path'),
    ('data_path', 'path'),
    ('pid_file', 'path'),
    ('log_file', 'path'),
    ('log_level', 'str'),
    ('log_max_size', 'int'),
    ('log_num_backups', 'int'),
    ('core_url', 'str'),
    ('service_url', 'str'),
    ('provider', 'str'),
    ('description', 'str'),
    ('environ', 'dict'),
    ('setuid', 'bool'),
    ('uid_min', 'int'),
    ('uid_max', 'int'),
    ('engine_timeout', 'int'),
]

defaults = {
    'port': 9000,
    'debug': False,
    'daemon': True,
    'logs_path': '%(home)s/logs',
    'data_path': '%(home)s/data',
    'pid_file': "%(home)s/onlinelab-service-%(port)s.pid",
    'log_file': "%(logs_path)s/onlinelab-service-%(port)s.log",
    'log_level': 'info',
    'log_max_size': 10*1000*1000,      # store 10 MB in a log file
    'log_num_backups': 10,             # keep 10 log files at most
    'core_url': 'http://localhost:8000',
    'service_url': 'http://localhost:%(port)s',
    'provider': 'Unknown service provider',
    'description': '',
    'environ': {},
    'setuid': True,
    'uid_min': 10000,
    'uid_max': 50000,
    'engine_timeout': 20,              # wait at most 20 seconds
}

