"""Configuration options for Online Lab core. """

options = [
    ('port', 'int'),
    ('debug', 'bool'),
    ('daemon', 'bool'),
    ('logs_path', 'path'),
    ('data_path', 'path'),
    ('static_path', 'path'),
    ('templates_path', 'path'),
    ('pid_file', 'path'),
    ('log_file', 'path'),
    ('log_level', 'str'),
    ('log_max_size', 'int'),
    ('log_num_backups', 'int'),
    ('auth', 'bool'),
    ('cors', 'bool'),
    ('allowed_origins', 'list'),
]

defaults = {
    'port': 8000,
    'debug': False,
    'daemon': True,
    'logs_path': '%(home)s/logs',
    'data_path': '%(home)s/data',
    'static_path': '%(home)s/static',
    'templates_path': '%(home)s/templates',
    'pid_file': "%(home)s/onlinelab-core-%(port)s.pid",
    'log_file': "%(logs_path)s/onlinelab-core-%(port)s.log",
    'log_level': 'info',
    'log_max_size': 10*1000*1000,      # store 10 MB in a log file
    'log_num_backups': 10,             # keep 10 log files at most
    'auth': True,
    'cors': False,
    'allowed_origins': None,
}

