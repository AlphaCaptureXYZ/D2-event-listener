echo "Getting the new container id"
CURRENT_ID=$(sudo docker ps -aqf "name=d2-event-listener")
echo "the current container id is $CURRENT_ID"

sleep 60s

# reset (stop) and start again
echo "Stopping the current container"
sudo docker stop $CURRENT_ID
sleep 10s
echo "Starting the new container"
sudo docker start $CURRENT_ID
sleep 5s

echo "Get docker processes after the previous stop and start"
sudo docker ps