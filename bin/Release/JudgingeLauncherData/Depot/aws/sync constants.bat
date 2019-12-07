cd constants

aws s3 sync . s3://development-completejudging-constants --acl public-read
aws s3 sync . s3://production-completejudging-constants --acl public-read

exit
