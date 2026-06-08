run:
	npm install && npm start

docker:
	docker build -t demo-app . && docker run --env-file .env -p 3000:3000 demo-app

scan:
	docker run --rm \
		-v /var/run/docker.sock:/var/run/docker.sock \
		aquasec/trivy image --severity HIGH,CRITICAL demo-app
