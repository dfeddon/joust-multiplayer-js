/*jslint
    this
*/
function game_toast()
{
  this.toast = document.getElementById('toast');
}

game_toast.prototype.show = function(data)
{
  console.log('show toast', data);
  /*
    data:
      action:
        takeFlag - PLAYER has siezed FLAG. Rally to PLACQUE.
        slotFlag - PLAYER planted FLAG. TEAM has advanced to PLACQUE.
        carrierDied - PLAYER carrying FLAG has fallen to OPPONENT.
        flagReset - FLAG has retuned to PLACQUE.
        player5kills - PLAYER has achieved 5 kills.
        player10kills - PLAYER is dominating with 10 kills.
        player20kills - PLAYER is eviscerating with 20 kills.
        player50kills - 50th kill! PLAYER is elite.
        playerInCavern - PLAYER has dared enter the treacherous cavern.
        playerInDiamondChamber - PLAYER entered the Diamon Chamber.
        playerGotDiamond - PLAYER has won the Diamond! The field is flipped.
  */
  if (!data)
  data = {action: "takeFlag", playerName: "Jouster", playerTeam: 0, flagName: "Mid Flag", targetSlot: "Placque #3"};
  switch(data.action)
  {
    case "takeFlag":

      if (data.playerTeam === 0) data.playerTeam = "red";
      else data.playerTeam = "blue";

      var dir = "over";
      switch(data.targetSlot)
      {
          case "slot1":
          case "slot3":
          case "slot5":
          case "slot7":
          case "slot9":
              dir = "down";
          break;

          case "slot2":
          case "slot4":
          case "slot6":
          case "slot8":
          case "slot10":
            dir = "up";
          break;

          case "midSlot":
          case "slotRed":
          case "slotBlue":
            dir = "over";
          break;
      }

      this.toast.innerHTML = "<font color='" + data.playerTeam + "'<b>" + data.playerName + "</b></font> siezed the <font color='#fff'><b>"+ this.getFlagLabel(data.flagName) + "</b></font>!<br>Rally " + dir + " to <font color='yellow'><b>"+ this.getSlotLabel(data.targetSlot) + "</b></font>!";

    break;

    case "slotFlag":
    break;

    case "carrierDied":
    break;

    case "flagReset":
    break;

    case "player5kills":
    break;

    case "player10kills":
    break;

    case "player20kills":
    break;

    case "player50kills":
    break;

    case "playerInCanvern":
    break;

    case "playerInDiamondChamber":
    break;

    case "playerGotDiamond":
    break;

  }

  // display
  this.toast.style.display = 'block';

  setTimeout(this.timeoutShown.bind(this), 5000);
};

game_toast.prototype.hide = function()
{
  console.log('hide toast', this);
  this.toast.style.display = "none";
};

game_toast.prototype.timeoutShown = function()
{
  this.hide();
};

game_toast.prototype.getFlagLabel = function(name)
{
  var label = "none";
  if (name == "midFlag")
    label = "Mid Flag";
  else if (name == "redFlag")
    label = "Red Flag";
  else if (name == "blueFlag")
    label = "Blue Flag";

  return label;
};

game_toast.prototype.getSlotLabel = function(slot)
{
  var label = "none";

  switch(slot)
  {
    case "slotRed":
      label = "Red Base Placque";
    break;

    case "slotBlue":
      label = "Blue Base Placque";
    break;

    case "midSlot":
      label = "Mid Placque";
    break;

    case "slot1":
      label = "Placque #1";
    break;

    case "slot2":
      label = "Placque #2";
    break;

    case "slot3":
      label = "Placque #3";
    break;

    case "slot4":
      label = "Placque #4";
    break;

    case "slot5":
      label = "Placque #5";
    break;

    case "slot6":
      label = "Placque #6";
    break;

    case "slot7":
      label = "Placque #7";
    break;

    case "slot8":
      label = "Placque #8";
    break;

    case "slot9":
      label = "Placque #9";
    break;

    case "slot10":
      label = "Placque #10";
    break;

  }

  return label;
};

module.exports = game_toast;
