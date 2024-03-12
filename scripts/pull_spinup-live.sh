echo "Get docker processes"
sudo docker ps

echo "Getting the current container id"
CURRENT_CONTAINER_ID=$(sudo docker ps -aqf "name=d2-event-listener")
echo "the current container id is $CURRENT_CONTAINER_ID"

echo "Getting current image id"
CURRENT_IMAGE_ID=$(sudo docker images 'd2-event-listener' -a -q)
echo "the current image id is $CURRENT_IMAGE_ID"

echo "Deleting/Stopping the previous containers/images"
sudo docker stop $CURRENT_CONTAINER_ID
sleep 1s
sudo docker rm $CURRENT_CONTAINER_ID
sleep 1s
sudo docker rmi $CURRENT_IMAGE_ID
sleep 1s

echo "Building D2 Event Listener Image"
docker-compose -f docker-compose.yml up --build --no-start
sleep 5s
docker-compose up --build -d

sleep 60s

echo "Getting the current container id"
CURRENT_CONTAINER_ID=$(sudo docker ps -aqf "name=d2-event-listener")
echo "the current container id is $CURRENT_CONTAINER_ID"

echo "Getting current image id"
CURRENT_IMAGE_ID=$(sudo docker images 'd2-event-listener' -a -q)
echo "the current image id is $CURRENT_IMAGE_ID"

echo "Awaiting to reset"

echo "Stopping the current container"
sudo docker stop $CURRENT_CONTAINER_ID
sleep 120s
echo "Starting the new container"
sudo docker start $CURRENT_CONTAINER_ID
sleep 5s

echo "Finished!"
echo "Get docker processes after the previous changes/updates"
sudo docker ps

# echo "Get docker processes after the previous stop and start"
# sudo docker ps
