echo "Get docker processes"
sudo docker ps

echo "Getting the current container id"
CURRENT_CONTAINER_ID=$(sudo docker ps -aqf "name=d2-event-listener")
echo "the current container id is $CURRENT_CONTAINER_ID"

echo "Getting current image id"
CURRENT_IMAGE_ID=$(sudo docker images 'd2-event-listener' -a -q)
echo "the current image id is $CURRENT_IMAGE_ID"

echo "Awaiting to reset"

echo "Stopping the current container"
sudo docker stop $CURRENT_CONTAINER_ID
sleep 65s
echo "Starting the new container"
sudo docker start $CURRENT_CONTAINER_ID
sleep 5s

echo "Finished!"
echo "Get docker processes after the previous changes/updates"
sudo docker ps

# echo "Get docker processes after the previous stop and start"
# sudo docker ps
