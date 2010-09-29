"""Configuration options for Online Lab services. """

options = [
    ('port', 'int'),
    ('debug', 'bool'),
    ('daemon', 'bool'),
    ('pid_file', 'path'),
    ('log_file', 'path'),
    ('log_level', 'str'),
    ('log_max_size', 'int'),
    ('log_num_backups', 'int'),
    ('core_url', 'str'),
    ('service_url', 'str'),
]

defaults = {
    'port': 9000,
    'debug': False,
    'daemon': True,
    'pid_file': "onlinelab-service-%(port)s.pid",
    'log_file': "onlinelab-service-%(port)s.log",
    'log_level': 'info',
    'log_max_size': 10*1000*1000,      # store 10 MB in a log file
    'log_num_backups': 10,             # keep 10 log files at most
    'core_url': 'http://localhost:8000',
    'service_url': 'http://localhost:%(port)s',
}

