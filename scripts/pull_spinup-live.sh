
echo "Copying Dockerfile"
echo "Getting current id"
CURRENT_ID=$(sudo docker ps -a -q --filter ancestor=dii-event-listener-app)
echo "the current id is $CURRENT_ID"
echo "Building the DII Site image"
sudo docker build . --no-cache -t dii-event-listener-app --file Dockerfile
echo "Stopping and removing the previous image"
sudo docker stop $CURRENT_ID
sudo docker rm $CURRENT_ID
echo "Running the new image"
sleep 1s
sudo docker run -d -p 3006:3006 dii-event-listener-app
echo "Listing the running containers"
sudo docker ps
echo "Cleaning up (prune)"
sudo docker system prune --force